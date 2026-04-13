# 13 key grid regions with accurate transmission lengths, coordinates and population
# Sources: Wikipedia national grid articles, IEA 2024, NRG Expert, MapYourGrid
REGIONS = [
    {
        "id": "ca_ontario",   "name": "Ontario Grid",         "country": "Canada",
        "lat": 51.0,  "lon": -85.0,
        "line_km": 30_000,    # IESO: ~30,000 km transmission
        "age_factor": 1.4,
        "population_millions": 14.7,   # Ontario population 2024
    },
    {
        "id": "ca_quebec",    "name": "Quebec Grid",          "country": "Canada",
        "lat": 53.0,  "lon": -72.0,
        "line_km": 34_000,    # Hydro-Québec: 34,000 km HV lines
        "age_factor": 1.5,
        "population_millions": 8.9,    # Quebec population 2024
    },
    {
        "id": "us_northeast", "name": "US Northeast",         "country": "USA",
        "lat": 44.0,  "lon": -72.0,
        "line_km": 75_000,    # ISO-NE + NYISO combined HV transmission
        "age_factor": 1.3,
        "population_millions": 57.0,   # New England + NY + NJ + PA
    },
    {
        "id": "us_midwest",   "name": "US Midwest",           "country": "USA",
        "lat": 42.0,  "lon": -89.0,
        "line_km": 100_000,   # MISO footprint HV transmission
        "age_factor": 1.2,
        "population_millions": 65.0,   # MISO service territory
    },
    {
        "id": "scandinavia",  "name": "Scandinavia",          "country": "Norway/Sweden",
        "lat": 63.0,  "lon": 15.0,
        "line_km": 50_000,    # Statnett + Svenska Kraftnät combined
        "age_factor": 0.9,
        "population_millions": 27.0,   # Norway + Sweden 2024
    },
    {
        "id": "uk_grid",      "name": "UK National Grid",     "country": "UK",
        "lat": 54.0,  "lon": -2.0,
        "line_km": 25_000,    # National Grid ET: ~25,000 km transmission
        "age_factor": 1.1,
        "population_millions": 67.0,   # Great Britain population 2024
    },
    {
        "id": "russia_west",  "name": "Western Russia",       "country": "Russia",
        "lat": 58.0,  "lon": 40.0,
        "line_km": 220_000,   # FGC UES western portion estimate
        "age_factor": 1.6,
        "population_millions": 100.0,  # European Russia population
    },
    {
        "id": "china_north",  "name": "Northern China Grid",  "country": "China",
        "lat": 42.0,  "lon": 115.0,
        "line_km": 200_000,   # State Grid North China regional grid
        "age_factor": 1.0,
        "population_millions": 420.0,  # North China grid provinces
    },
    {
        "id": "japan",        "name": "Japan Eastern Grid",   "country": "Japan",
        "lat": 37.0,  "lon": 138.0,
        "line_km": 45_000,    # TEPCO + Tohoku EPCO combined
        "age_factor": 0.8,
        "population_millions": 70.0,   # Eastern Japan (Tokyo + Tohoku)
    },
    {
        "id": "aus_east",     "name": "Australian East Grid", "country": "Australia",
        "lat": -33.0, "lon": 151.0,
        "line_km": 40_000,    # NEM (National Electricity Market) transmission
        "age_factor": 1.0,
        "population_millions": 22.0,   # NEM states population
    },
    {
        "id": "india_north",  "name": "Northern India Grid",  "country": "India",
        "lat": 28.0,  "lon": 77.0,
        "line_km": 100_000,   # Northern Regional Grid (POSOCO)
        "age_factor": 1.2,
        "population_millions": 500.0,  # Northern region states
    },
    {
        "id": "brazil_south", "name": "Southern Brazil Grid", "country": "Brazil",
        "lat": -23.0, "lon": -46.0,
        "line_km": 60_000,    # ONS southern/southeastern region
        "age_factor": 1.1,
        "population_millions": 90.0,   # SE + S Brazil regions
    },
    {
        "id": "south_africa", "name": "South Africa Grid",    "country": "South Africa",
        "lat": -29.0, "lon": 25.0,
        "line_km": 33_000,    # Eskom transmission: ~33,000 km
        "age_factor": 1.3,
        "population_millions": 62.0,   # South Africa 2024
    },
]

def compute_risk_scores(symh_predicted: float, storm_category: int) -> list[dict]:
    """Compute 0-100 risk score for each region based on storm forecast."""
    max_line_km = max(r["line_km"] for r in REGIONS)
    results = []
    for r in REGIONS:
        lat_factor   = _latitude_factor(abs(r["lat"]))
        storm_factor = _storm_factor(symh_predicted)
        line_factor  = min(r["line_km"] / max_line_km, 1.0)
        age_factor   = min(r["age_factor"] / 1.6, 1.0)
        raw_score = (
            lat_factor   * 0.40 +
            storm_factor * 0.35 +
            line_factor  * 0.15 +
            age_factor   * 0.10
        ) * 100
        risk_score  = round(min(raw_score, 100), 1)
        alert_level = _risk_to_alert(risk_score)
        results.append({
            **r,
            "risk_score":  risk_score,
            "alert_level": alert_level,
            "risk_level":  _score_to_risk_level(risk_score),
        })
    return sorted(results, key=lambda x: x["risk_score"], reverse=True)


def _latitude_factor(lat_abs: float) -> float:
    if lat_abs >= 60: return 1.0
    if lat_abs >= 50: return 0.8
    if lat_abs >= 40: return 0.55
    if lat_abs >= 30: return 0.30
    return 0.10

def _storm_factor(symh: float) -> float:
    if symh > -30:  return 0.05
    if symh > -50:  return 0.30
    if symh > -100: return 0.60
    if symh > -200: return 0.85
    return 1.0

def _risk_to_alert(score: float) -> str:
    if score >= 75: return "SEVERE"
    if score >= 50: return "ELEVATED"
    if score >= 25: return "MODERATE"
    return "CALM"

def _score_to_risk_level(score: float) -> str:
    """Maps to frontend RiskLevel: LOW | MEDIUM | HIGH | CRITICAL
       Aligned with legend: High(75-100), Moderate(50-74), Low-Mod(30-49), Safe(0-29)
    """
    if score >= 75: return "CRITICAL"   # High
    if score >= 50: return "HIGH"       # Moderate
    if score >= 30: return "MEDIUM"     # Low-Mod
    return "LOW"                        # Safe