from fastapi import APIRouter
import httpx
from backend.services.noaa_client import get_cache, fetch_latest_solar_data, solar_cache

router = APIRouter(prefix="/solar", tags=["Solar"])


@router.get("/latest")
async def get_latest_solar():
    """Return the most recent solar wind reading."""
    cache = get_cache()
    if not cache:
        return {"error": "No data yet — waiting for first NOAA poll"}
    return cache[-1]


@router.get("/history")
async def get_solar_history():
    """Return last 288 readings (24 hours)."""
    return get_cache()


@router.post("/refresh")
async def manual_refresh():
    """Manually trigger a NOAA data fetch."""
    reading = await fetch_latest_solar_data()
    if reading:
        return {"status": "ok", "reading": reading}
    return {"status": "error", "message": "NOAA fetch failed"}


@router.post("/seed")
async def seed_cache():
    """Seed cache with last 24h of real NOAA data for immediate inference."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        plasma_r = await client.get(
            "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"
        )
        mag_r = await client.get(
            "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json"
        )

        plasma = plasma_r.json()[1:]   # skip header row
        mag    = mag_r.json()[1:]      # skip header row

        solar_cache.clear()
        rows_added = 0

        for p, m in zip(plasma[-288:], mag[-288:]):
            try:
                reading = {
                    "timestamp":      p[0],
                    "proton_density": float(p[1]) if p[1] else 5.0,
                    "sw_speed":       float(p[2]) if p[2] else 400.0,
                    "proton_temp":    float(p[3]) if p[3] else 100000.0,
                    "bz_nT":          float(m[3]) if m[3] else 0.0,
                    "flow_pressure":  float(p[1] or 5) * float(p[2] or 400)**2 * 1.67e-6,
                    "ae_index":       100.0,
                    "symh_index":     0.0,
                }
                solar_cache.append(reading)
                rows_added += 1
            except Exception:
                continue

    return {
        "status":     "seeded",
        "rows_added": rows_added,
        "cache_size": len(solar_cache),
    }
