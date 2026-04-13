from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import asyncio, json, time, os
from dotenv import load_dotenv
load_dotenv()

from backend.routers import solar, forecast, regions, action_plan
from backend.services.noaa_client import fetch_latest_solar_data, get_cache, solar_cache
from backend.services.inference import run_inference
from backend.services.risk_engine import compute_risk_scores
from backend.services.storm_archive import HISTORICAL_STORMS


from data.database import engine, AsyncSessionLocal, Base, get_db
from data.models import SolarReading, Forecast, RegionAlert, ActionPlan
from data.crud import (
    upsert_solar_reading, get_latest_readings, count_readings,
    save_forecast, get_latest_forecast, get_forecast_history,
    get_regions_for_forecast, get_region_history,
    save_action_plan, get_latest_action_plan,
)

# ── Constants ─────────────────────────────────────────────────────────────────
MODEL_VERSION   = "2.1.0"
POLL_INTERVAL_S = 300          # 5 minutes
MIN_CACHE_SIZE  = 288          # 24 h × 12 readings/h

# ── Longitude lookup (not stored in DB) ──────────────────────────────────────
POPULATION: dict[str, float] = {
    "russia_west":  80.0,  "ca_quebec":   8.6,  "scandinavia":  27.0,
    "ca_ontario":   14.7,  "uk_grid":    67.0,  "china_north": 420.0,
    "us_midwest":   68.0,  "us_northeast":56.0, "aus_east":     22.0,
    "japan":       103.0,  "india_north": 500.0,"brazil_south":  90.0,
    "south_africa": 60.0,
}

def _score_to_risk_level(score: float) -> str:
    if score >= 75: return "CRITICAL"
    if score >= 50: return "HIGH"
    if score >= 25: return "MEDIUM"
    return "LOW"

LON_LOOKUP: dict[str, float] = {
    "russia_west":  40.0,
    "ca_quebec":   -72.0,
    "scandinavia":  15.0,
    "ca_ontario":  -85.0,
    "uk_grid":      -2.0,
    "china_north": 115.0,
    "us_midwest":  -89.0,
    "us_northeast":-72.0,
    "aus_east":    151.0,
    "japan":       138.0,
    "india_north":  77.0,
    "brazil_south":-46.0,
    "south_africa": 25.0,
}



# ── Scheduler ─────────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()

# ── Status tracking ───────────────────────────────────────────────────────────
_status: dict = {
    "dataFeedActive": False,
    "lastUpdated":    None,
    "apiLatencyMs":   0,
}

# ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        msg  = json.dumps(data)
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

manager = ConnectionManager()

# ── Background job: poll NOAA every 5 min + persist + broadcast ───────────────
async def poll_and_broadcast():
    t0      = time.monotonic()
    reading = await fetch_latest_solar_data()
    latency = int((time.monotonic() - t0) * 1000)

    if not reading:
        return

    solar_cache.append(reading)

    async with AsyncSessionLocal() as db:
        await upsert_solar_reading(db, reading)
        cache   = get_cache()
        fdata   = run_inference(cache)
        rgns    = compute_risk_scores(
            fdata["symh_predicted"],
            fdata["storm_category"],
        )
        await save_forecast(db, fdata, rgns)
        await db.commit()

    now = datetime.now(timezone.utc).isoformat()
    _status.update(dataFeedActive=True, lastUpdated=now, apiLatencyMs=latency)

    await manager.broadcast({
        "type":      "solar_update",
        "timestamp": now,
        "payload": {
            "solar":    reading,
            "forecast": fdata,
            "regions":  rgns,
        },
    })

# ── App lifespan ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if not present
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed cache from DB; top up from NOAA if sparse
    async with AsyncSessionLocal() as db:
        count = await count_readings(db)
        print(f"📦 DB has {count} solar readings")

        if count < MIN_CACHE_SIZE:
            print("🌐 Topping up from NOAA…")
            try:
                import httpx
                async with httpx.AsyncClient(timeout=15.0) as client:
                    plasma_r = await client.get(
                        "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"
                    )
                    mag_r = await client.get(
                        "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json"
                    )
                    plasma = plasma_r.json()[1:]
                    mag    = mag_r.json()[1:]

                for p, m in zip(plasma[-MIN_CACHE_SIZE:], mag[-MIN_CACHE_SIZE:]):
                    try:
                        reading = {
                            "timestamp":      p[0],
                            "proton_density": float(p[1]) if p[1] else 5.0,
                            "sw_speed":       float(p[2]) if p[2] else 400.0,
                            "proton_temp":    float(p[3]) if p[3] else 100_000.0,
                            "bz_nT":          float(m[3]) if m[3] else 0.0,
                            "flow_pressure":  float(p[1] or 5) * float(p[2] or 400) ** 2 * 1.67e-6,
                            "ae_index":       100.0,
                            "symh_index":     0.0,
                        }
                        await upsert_solar_reading(db, reading)
                    except Exception:
                        continue
                await db.commit()
                print("✅ NOAA top-up complete")
            except Exception as e:
                print(f"⚠️  NOAA seed failed: {e}")

        # Populate in-memory cache from DB
        rows = await get_latest_readings(db, limit=MIN_CACHE_SIZE)
        solar_cache.clear()
        for row in rows:
            solar_cache.append({
                "timestamp":      row.timestamp.isoformat(),
                "proton_density": row.proton_density,
                "sw_speed":       row.sw_speed,
                "proton_temp":    row.proton_temp,
                "bz_nT":          row.bz_nT,
                "flow_pressure":  row.flow_pressure,
                "ae_index":       row.ae_index,
                "symh_index":     row.symh_index,
            })
        print(f"✅ Cache loaded with {len(solar_cache)} readings")

    _status["dataFeedActive"] = True
    _status["lastUpdated"]    = datetime.now(timezone.utc).isoformat()

    scheduler.add_job(poll_and_broadcast, "interval", seconds=POLL_INTERVAL_S)
    scheduler.start()
    print(f"⏱️  Scheduler started — polling NOAA every {POLL_INTERVAL_S // 60} minutes")

    yield

    scheduler.shutdown()
    print("🛑 Scheduler stopped")


# ── App init ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CosmicGrid API",
    description="AI-powered space weather intelligence for energy grid resilience",
    version=MODEL_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                    # Vite dev server
        "https://your-vercel-url.vercel.app",       # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Sub-routers ───────────────────────────────────────────────────────────────
app.include_router(solar.router,       prefix="/solar",       tags=["Solar"])
app.include_router(forecast.router,    prefix="/forecast",    tags=["Forecast"])
app.include_router(regions.router,     prefix="/regions",     tags=["Regions"])
app.include_router(action_plan.router, prefix="/action-plan", tags=["Action Plan"])

# ── Health / status ───────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status":  "online",
        "service": "CosmicGrid API",
        "version": MODEL_VERSION,
    }

@app.get("/status")
async def get_status():
    """Live feed status for the frontend HUD."""
    return {
        "dataFeedActive": _status["dataFeedActive"],
        "lastUpdated":    _status["lastUpdated"],
        "modelVersion":   MODEL_VERSION,
        "replayMode":     False,
        "apiLatencyMs":   _status["apiLatencyMs"],
    }

# ── Solar wind (frontend-friendly alias) ──────────────────────────────────────
@app.get("/solar-wind")
async def get_solar_wind(hours: int = 24, db: AsyncSession = Depends(get_db)):
    """Return the last N hours of solar wind readings."""
    limit    = hours * 12          # one reading per 5 min
    readings = await get_latest_readings(db, limit=limit)
    return [
        {
            "timestamp":      r.timestamp.isoformat(),
            "bz_nT":          r.bz_nT,
            "sw_speed":       r.sw_speed,
            "proton_density": r.proton_density,
            "flow_pressure":  r.flow_pressure,
            "ae_index":       r.ae_index,
            "symh_index":     r.symh_index,
        }
        for r in readings
    ]

# ── Forecast ──────────────────────────────────────────────────────────────────
@app.get("/forecast")
async def get_forecast(db: AsyncSession = Depends(get_db)):
    """Latest forecast + region risk scores."""
    latest = await get_latest_forecast(db)
    if latest:
        region_list = await get_regions_for_forecast(db, latest.id)
        return {
            "forecast": {
                "symh_predicted":  latest.symh_predicted,
                "storm_category":  latest.storm_category,
                "storm_label":     latest.storm_label,
                "confidence":      latest.confidence,
                "alert_level":     latest.alert_level,
                "generated_at":    latest.generated_at.isoformat(),
                "forecast_series": run_inference(get_cache()).get("forecast_series", []),
            },
            "regions": [
                {
                    "id":          r.region_id,
                    "name":        r.region_name,
                    "country":     r.country,
                    "lat":         r.lat,
                    "lon":         LON_LOOKUP.get(r.region_id, 0.0),
                    "line_km":     r.line_km,
                    "age_factor":  r.age_factor,
                    "risk_score":  r.risk_score,
                    "alert_level": r.alert_level,
                }
                for r in region_list
            ],
        }

    # Fallback: compute live from cache
    cache   = get_cache()
    fdata   = run_inference(cache)
    rgns    = compute_risk_scores(fdata["symh_predicted"], fdata["storm_category"])
    return {"forecast": fdata, "regions": rgns}

# ── Regions ───────────────────────────────────────────────────────────────────
@app.get("/regions")
async def get_regions(db: AsyncSession = Depends(get_db)):
    """All regions with their latest risk scores."""
    latest = await get_latest_forecast(db)
    if latest:
        rows = await get_regions_for_forecast(db, latest.id)
        return [
            {
                "id":          r.region_id,
                "name":        r.region_name,
                "country":     r.country,
                "lat":         r.lat,
                "lon":                LON_LOOKUP.get(r.region_id, 0.0),
                "line_km":            r.line_km,
                "age_factor":         r.age_factor,
                "risk_score":         r.risk_score,
                "alert_level":        r.alert_level,
                "risk_level":         _score_to_risk_level(r.risk_score),
                "population_millions": POPULATION.get(r.region_id),
            }
            for r in rows
        ]
    cache = get_cache()
    fdata = run_inference(cache)
    return compute_risk_scores(fdata["symh_predicted"], fdata["storm_category"])

# ── Groq action-plan helper ───────────────────────────────────────────────────
GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL  = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL    = "llama-3.3-70b-versatile"           # swap to any Groq-hosted model you prefer

async def _generate_plan_groq(region_id: str, risk_score: float, alert_level: str) -> str:
    """Call Groq's OpenAI-compatible endpoint and return the action-plan text."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY environment variable is not set.")

    prompt = (
        f"You are a power-grid resilience engineer advising the operations team.\n"
        f"Region ID : {region_id}\n"
        f"Current risk score : {risk_score:.2f} / 100\n"
        f"Alert level : {alert_level}\n\n"
        f"Provide a concise, prioritised action plan (max 5 bullet points) "
        f"to protect this grid region from the incoming geomagnetic storm. "
        f"Include immediate actions (next 2 hours), short-term steps (2–24 hours), "
        f"and one monitoring instruction."
    )

    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "model":       GROQ_MODEL,
                "messages":    [{"role": "user", "content": prompt}],
                "max_tokens":  512,
                "temperature": 0.4,
            },
        )
        if not resp.is_success:
            raise RuntimeError(f"Groq {resp.status_code}: {resp.text}")
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


# ── Action plan endpoint ──────────────────────────────────────────────────────
@app.post("/action-plan")
async def get_action_plan(body: dict, db: AsyncSession = Depends(get_db)):
    """
    Generate (or retrieve a cached) Groq-powered action plan for a region.

    Body: { "region_id": "NA-NE", "risk_score": 72.4, "alert_level": "High" }
    """
    region_id   = body.get("region_id")
    risk_score  = float(body.get("risk_score", 0.0))
    alert_level = body.get("alert_level", "Unknown")

    if not region_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="region_id is required.")

    

    # Generate a fresh plan via Groq
    try:
        plan = await _generate_plan_groq(region_id, risk_score, alert_level)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")

    await save_action_plan(db, region_id, region_id, alert_level, risk_score, plan, GROQ_MODEL)
    await db.commit()
    return {"plan": plan, "region_id": region_id, "cached": False}

# ── Historical storms ─────────────────────────────────────────────────────────
@app.get("/storms/historical")
async def get_historical_storms(limit: int = 30):
    """Returns curated historical geomagnetic storm archive."""
    return HISTORICAL_STORMS[:limit]

# ── History endpoints ─────────────────────────────────────────────────────────
@app.get("/forecast/history")
async def forecast_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    forecasts = await get_forecast_history(db, limit)
    return [
        {
            "id":             f.id,
            "generated_at":   f.generated_at.isoformat(),
            "symh_predicted": f.symh_predicted,
            "storm_label":    f.storm_label,
            "alert_level":    f.alert_level,
            "confidence":     f.confidence,
        }
        for f in forecasts
    ]

@app.get("/regions/{region_id}/history")
async def region_history(
    region_id: str, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    alerts = await get_region_history(db, region_id, limit)
    return [
        {
            "risk_score":  a.risk_score,
            "alert_level": a.alert_level,
            "created_at":  a.created_at.isoformat(),
        }
        for a in alerts
    ]

@app.get("/solar/history")
async def solar_history(limit: int = 288, db: AsyncSession = Depends(get_db)):
    readings = await get_latest_readings(db, limit)
    return [
        {
            "timestamp":      r.timestamp.isoformat(),
            "bz_nT":          r.bz_nT,
            "sw_speed":       r.sw_speed,
            "proton_density": r.proton_density,
            "flow_pressure":  r.flow_pressure,
        }
        for r in readings
    ]

# ── WebSocket live feed ───────────────────────────────────────────────────────
@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    """
    Persistent live feed.
    • Sends an 'init' snapshot immediately on connect.
    • The scheduler broadcasts 'solar_update' to all clients every 5 minutes.
    • A lightweight ping keeps the connection alive between broadcasts.
    """
    await manager.connect(ws)
    try:
        # Send initial snapshot so the frontend renders without waiting 5 min
        cache   = get_cache()
        fdata   = run_inference(cache)
        rgns    = compute_risk_scores(fdata["symh_predicted"], fdata["storm_category"])
        await ws.send_text(json.dumps({
            "type":      "init",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "solar":    cache[-1] if cache else {},
                "forecast": fdata,
                "regions":  rgns,
            },
        }))

        # Keep-alive ping every 30 s (browser WS times out without traffic)
        while True:
            await asyncio.sleep(30)
            await ws.send_text(json.dumps({"type": "ping"}))

    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)