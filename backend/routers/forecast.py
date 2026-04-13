from fastapi import APIRouter
from backend.services.noaa_client import get_cache
from backend.services.inference import run_inference

router = APIRouter(prefix="/forecast", tags=["Forecast"])

@router.get("/")
async def get_forecast():
    """Run LSTM inference on latest 24h window and return storm forecast."""
    cache = get_cache()
    result = run_inference(cache)
    return result
