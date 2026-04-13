from fastapi import APIRouter
from backend.models.schemas import ActionPlanRequest, ActionPlanResponse
from backend.services.groq_client import generate_action_plan
from backend.services.risk_engine import REGIONS

router = APIRouter(prefix="/action-plan", tags=["Action Plan"])

STORM_LABELS = ["No Storm", "Minor (G1)", "Moderate (G2)", "Strong (G3)", "Extreme (G4/G5)"]

@router.post("/", response_model=ActionPlanResponse)
async def get_action_plan(req: ActionPlanRequest):
    """Generate a Groq + Llama 3.3 70B action plan for a region."""
    region = next((r for r in REGIONS if r["id"] == req.region_id), None)
    if not region:
        return {"error": f"Region '{req.region_id}' not found"}

    plan = generate_action_plan(
        region_name     = region["name"],
        country         = region["country"],
        storm_category  = req.storm_category,
        symh_predicted  = req.symh_predicted,
    )

    return ActionPlanResponse(
        region       = region["name"],
        storm_label  = STORM_LABELS[req.storm_category],
        plan         = plan,
    )
