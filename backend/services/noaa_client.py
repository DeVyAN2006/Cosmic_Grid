import httpx, logging
from datetime import datetime

logger = logging.getLogger(__name__)

NOAA_ENDPOINTS = {
    "solar_wind": "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
    "mag":        "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json",
    "kp":         "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    "xray":       "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json",
    "alerts":     "https://services.swpc.noaa.gov/products/alerts.json",
}

# In-memory cache — last 288 readings (24 hours at 5-min resolution)
solar_cache: list[dict] = []

async def fetch_latest_solar_data() -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            plasma_r = await client.get(NOAA_ENDPOINTS["solar_wind"])
            mag_r    = await client.get(NOAA_ENDPOINTS["mag"])

            plasma = plasma_r.json()
            mag    = mag_r.json()

            # Latest readings (last row, skip header at index 0)
            p = plasma[-1]   # [time, density, speed, temp]
            m = mag[-1]      # [time, bx, by, bz, bt, lat, lon]

            reading = {
                "timestamp":       p[0],
                "proton_density":  float(p[1]) if p[1] not in (None, "null", "") else 5.0,
                "sw_speed":        float(p[2]) if p[2] not in (None, "null", "") else 400.0,
                "proton_temp":     float(p[3]) if p[3] not in (None, "null", "") else 100000.0,
                "bz_nT":           float(m[3]) if m[3] not in (None, "null", "") else 0.0,
                "flow_pressure":   float(p[1]) * float(p[2])**2 * 1.67e-6 if p[1] and p[2] else 2.0,
                "ae_index":        100.0,   # placeholder — AE requires separate endpoint
                "symh_index":      0.0,     # placeholder — filled from Kp proxy
            }

            # Keep rolling 288-step cache
            solar_cache.append(reading)
            if len(solar_cache) > 288:
                solar_cache.pop(0)

            return reading

    except Exception as e:
        logger.error(f"NOAA fetch failed: {e}")
        return None

def get_cache() -> list[dict]:
    return solar_cache
