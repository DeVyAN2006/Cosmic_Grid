import httpx, logging, asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

NOAA_ENDPOINTS = {
    "solar_wind": "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
    "mag":        "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json",
    "kp":         "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    "xray":       "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json",
    "alerts":     "https://services.swpc.noaa.gov/products/alerts.json",
}

MAX_RETRIES    = 3
RETRY_DELAY_S  = 5   # seconds between retries

# In-memory cache — last 288 readings (24 hours at 5-min resolution)
solar_cache: list[dict] = []

async def _fetch_json(client: httpx.AsyncClient, url: str) -> list:
    """Fetch JSON with retries on transient errors (network glitches, malformed JSON)."""
    last_err: Exception = RuntimeError("No attempts made")
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            if not isinstance(data, list) or len(data) < 2:
                raise ValueError(f"Unexpected response shape from {url}")
            return data
        except (httpx.HTTPError, ValueError, Exception) as e:
            last_err = e
            if attempt < MAX_RETRIES:
                logger.warning(f"NOAA fetch attempt {attempt}/{MAX_RETRIES} failed ({e}) — retrying in {RETRY_DELAY_S}s")
                await asyncio.sleep(RETRY_DELAY_S)
            else:
                logger.error(f"NOAA fetch failed after {MAX_RETRIES} attempts: {e}")
    raise last_err

async def fetch_latest_solar_data() -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            plasma, mag = await asyncio.gather(
                _fetch_json(client, NOAA_ENDPOINTS["solar_wind"]),
                _fetch_json(client, NOAA_ENDPOINTS["mag"]),
            )

            # Latest readings (last row, skip header at index 0)
            p = plasma[-1]   # [time, density, speed, temp]
            m = mag[-1]      # [time, bx, by, bz, bt, lat, lon]

            def safe_float(v, default: float) -> float:
                try:
                    return float(v) if v not in (None, "null", "", "NaN") else default
                except (TypeError, ValueError):
                    return default

            density = safe_float(p[1], 5.0)
            speed   = safe_float(p[2], 400.0)

            reading = {
                "timestamp":      p[0],
                "proton_density": density,
                "sw_speed":       speed,
                "proton_temp":    safe_float(p[3], 100_000.0),
                "bz_nT":          safe_float(m[3], 0.0),
                "flow_pressure":  density * speed ** 2 * 1.67e-6,
                "ae_index":       100.0,
                "symh_index":     0.0,
            }

            solar_cache.append(reading)
            if len(solar_cache) > 288:
                solar_cache.pop(0)

            return reading

    except Exception as e:
        logger.error(f"NOAA fetch failed: {e}")
        return None

def get_cache() -> list[dict]:
    return solar_cache