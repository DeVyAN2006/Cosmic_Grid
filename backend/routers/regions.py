from fastapi import APIRouter
from backend.services.noaa_client import get_cache
from backend.services.inference import run_inference
from backend.services.risk_engine import compute_risk_scores

router = APIRouter(prefix="/regions", tags=["Regions"])

@router.get("/")
async def get_all_regions():
    """Return risk scores for all 13 grid regions."""
    cache    = get_cache()
    forecast = run_inference(cache)
    regions  = compute_risk_scores(
        forecast["symh_predicted"],
        forecast["storm_category"]
    )
    return {
        "forecast": forecast,
        "regions":  regions,
    }

@router.get("/{region_id}")
async def get_region(region_id: str):
    """Return risk score for a specific region."""
    cache    = get_cache()
    forecast = run_inference(cache)
    regions  = compute_risk_scores(
        forecast["symh_predicted"],
        forecast["storm_category"]
    )
    match = next((r for r in regions if r["id"] == region_id), None)
    if not match:
        return {"error": f"Region '{region_id}' not found"}
    return {"forecast": forecast, "region": match}
