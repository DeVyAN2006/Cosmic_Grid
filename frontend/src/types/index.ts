// ─── Storm & Risk Classification ────────────────────────────────────────────
export type StormCategory = 'None' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
export type RiskLevel     = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type Urgency       = 'ROUTINE' | 'ELEVATED' | 'IMMEDIATE';
export type StepCategory  = 'PROTECTION' | 'LOAD_SHED' | 'ROUTING' | 'ALERT' | 'MONITORING';
export type TransformerAge = 'NEW' | 'AGING' | 'CRITICAL';

// ─── Solar Wind ──────────────────────────────────────────────────────────────
export interface SolarWindData {
  timestamp:   string;
  speed:       number;   // km/s
  bz:          number;   // nT — negative = southward = geoeffective
  density:     number;   // p/cm³
  temperature: number;   // Kelvin
  xrayFlux:    number;   // W/m²
  kpIndex:     number;   // 0–9
}

// ─── Forecast ────────────────────────────────────────────────────────────────
export interface ForecastPoint {
  timestamp:    string;
  predictedKp:  number;
  upperBound:   number;
  lowerBound:   number;
}

export interface StormForecast {
  predictedKp:         number;
  stormCategory:       StormCategory;
  arrivalHours:        number;
  probability:         number;       // 0–1
  confidenceInterval:  [number, number];
  forecastSeries:      ForecastPoint[];
  modelVersion:        string;
}

// ─── Grid Regions ────────────────────────────────────────────────────────────
export interface GridRegion {
  id:                     string;
  name:                   string;
  country:                string;
  lat:                    number;
  lon:                    number;
  riskScore:              number;
  riskLevel:              RiskLevel;
  deltaFromBaseline:      number;
  transmissionLineKm:     number;
  transformerAgeCategory: TransformerAge;
  populationMillions:     number | null;
}

// ─── AI Action Plan ──────────────────────────────────────────────────────────
export interface ActionStep {
  order:       number;
  category:    StepCategory;
  title:       string;
  description: string;
  timeframe:   string;
}

export interface ActionPlan {
  regionId:      string;
  regionName:    string;
  generatedAt:   string;
  stormCategory: StormCategory;
  steps:         ActionStep[];
  alertDraft:    string;
  urgency:       Urgency;
}

// ─── Historical Storms ───────────────────────────────────────────────────────
export interface HistoricalStorm {
  id:              string;
  date:            string;
  name:            string;
  peakKp:          number;
  category:        StormCategory;
  affectedRegions: string[];
  economicImpact:  string;
  durationHours:   number;
  description:     string;
}

// ─── System Status ───────────────────────────────────────────────────────────
export interface SystemStatus {
  dataFeedActive: boolean;
  lastUpdated:    string;
  modelVersion:   string;
  replayMode:     boolean;
  apiLatencyMs:   number;
}

// ─── WebSocket ───────────────────────────────────────────────────────────────
export type WsMessageType =
  | 'solar_update'
  | 'forecast_update'
  | 'region_update'
  | 'system_alert';

export interface WebSocketMessage {
  type:      WsMessageType;
  payload:   unknown;
  timestamp: string;
}
