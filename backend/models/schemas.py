from pydantic import BaseModel
from typing import Optional

class SolarReading(BaseModel):
    timestamp: str
    bz_nT: float
    sw_speed: float
    proton_density: float
    proton_temp: float
    flow_pressure: float
    ae_index: float
    symh_index: float

class ForecastResponse(BaseModel):
    symh_predicted: float        # real nT
    storm_category: int          # 0–4
    storm_label: str             # "No Storm", "G1 Minor" etc.
    confidence: float            # 0–1
    alert_level: str             # CALM / ELEVATED / SEVERE / EXTREME

class RegionRisk(BaseModel):
    region_id: str
    name: str
    country: str
    risk_score: float            # 0–100
    latitude: float
    alert_level: str

class ActionPlanRequest(BaseModel):
    region_id: str
    storm_category: int
    symh_predicted: float

class ActionPlanResponse(BaseModel):
    region: str
    storm_label: str
    plan: str                    # full markdown action plan from Groq
