import type { SolarWindData, StormForecast, GridRegion, HistoricalStorm, SystemStatus } from '../types';

// Generate 48 hours of mock solar wind data
const now = Date.now();
export const MOCK_SOLAR: SolarWindData[] = Array.from({ length: 48 }, (_, i) => ({
  timestamp:   new Date(now - (47 - i) * 30 * 60 * 1000).toISOString(),
  speed:       420 + Math.sin(i * 0.3) * 80 + Math.random() * 30,
  bz:          -8 + Math.sin(i * 0.5) * 12 + Math.random() * 4 - 2,
  density:     6 + Math.sin(i * 0.2) * 4 + Math.random() * 2,
  temperature: 120000 + Math.random() * 40000,
  xrayFlux:    2.3e-6 + Math.random() * 1e-7,
  kpIndex:     3.5 + Math.sin(i * 0.4) * 2 + Math.random(),
}));

export const MOCK_FORECAST: StormForecast = {
  predictedKp:        6.8,
  stormCategory:      'G2',
  arrivalHours:       18,
  probability:        0.82,
  confidenceInterval: [5.9, 7.6],
  modelVersion:       '2.1.0',
  forecastSeries: Array.from({ length: 48 }, (_, i) => ({
    timestamp:   new Date(now + i * 60 * 60 * 1000).toISOString(),
    predictedKp: Math.min(9, 2 + (i < 18 ? i * 0.26 : (48 - i) * 0.15)),
    upperBound:  Math.min(9, 2 + (i < 18 ? i * 0.30 : (48 - i) * 0.18)),
    lowerBound:  Math.max(0, 2 + (i < 18 ? i * 0.20 : (48 - i) * 0.12)),
  })),
};

export const MOCK_REGIONS: GridRegion[] = [
  { id: 'ontario-ca',    name: 'Ontario Grid',        country: 'Canada',    lat: 44.0,  lon: -79.0,  riskScore: 87, riskLevel: 'CRITICAL', deltaFromBaseline: 23,  transmissionLineKm: 31000, transformerAgeCategory: 'AGING',    populationMillions: 14.8 },
  { id: 'scandinavia',   name: 'Scandinavian Grid',   country: 'Norway/SE', lat: 62.0,  lon: 15.0,   riskScore: 84, riskLevel: 'CRITICAL', deltaFromBaseline: 19,  transmissionLineKm: 28000, transformerAgeCategory: 'NEW',      populationMillions: 11.2 },
  { id: 'great-lakes',   name: 'Great Lakes Region',  country: 'USA',       lat: 42.0,  lon: -83.0,  riskScore: 79, riskLevel: 'HIGH',     deltaFromBaseline: 16,  transmissionLineKm: 45000, transformerAgeCategory: 'CRITICAL', populationMillions: 22.1 },
  { id: 'uk-grid',       name: 'UK National Grid',    country: 'UK',        lat: 54.0,  lon: -2.0,   riskScore: 72, riskLevel: 'HIGH',     deltaFromBaseline: 12,  transmissionLineKm: 25000, transformerAgeCategory: 'AGING',    populationMillions: 67.0 },
  { id: 'siberia',       name: 'Siberian Grid',       country: 'Russia',    lat: 60.0,  lon: 80.0,   riskScore: 68, riskLevel: 'HIGH',     deltaFromBaseline: 8,   transmissionLineKm: 62000, transformerAgeCategory: 'CRITICAL', populationMillions: 9.4  },
  { id: 'ne-usa',        name: 'NE US Corridor',      country: 'USA',       lat: 42.5,  lon: -71.0,  riskScore: 61, riskLevel: 'MEDIUM',   deltaFromBaseline: 7,   transmissionLineKm: 38000, transformerAgeCategory: 'AGING',    populationMillions: 55.0 },
  { id: 'australia-e',   name: 'Eastern Australia',   country: 'Australia', lat: -33.0, lon: 151.0,  riskScore: 34, riskLevel: 'LOW',      deltaFromBaseline: -3,  transmissionLineKm: 19000, transformerAgeCategory: 'NEW',      populationMillions: 16.0 },
  { id: 'india-north',   name: 'Northern India Grid', country: 'India',     lat: 28.0,  lon: 77.0,   riskScore: 29, riskLevel: 'LOW',      deltaFromBaseline: -1,  transmissionLineKm: 41000, transformerAgeCategory: 'AGING',    populationMillions: 210.0 },
];

export const MOCK_STORMS: HistoricalStorm[] = [
  { id: 'quebec-1989',  date: '1989-03-13', name: 'Quebec Storm',      peakKp: 9.0, category: 'G5', affectedRegions: ['Ontario Grid', 'NE US Corridor', 'Scandinavian Grid'], economicImpact: '$2B+',  durationHours: 36, description: 'The most infamous grid disaster from space weather. Induced currents collapsed the Hydro-Quebec grid in 90 seconds, leaving 6 million Canadians without power for 9 hours. Multiple transformers were permanently damaged.' },
  { id: 'halloween-2003', date: '2003-10-29', name: 'Halloween Storms', peakKp: 9.0, category: 'G5', affectedRegions: ['Scandinavian Grid', 'UK National Grid'], economicImpact: '$500M',  durationHours: 72, description: 'Two back-to-back X-class flares caused widespread satellite anomalies, HF radio blackouts, and forced aviation rerouting. The Swedish grid experienced a 20-minute blackout affecting 50,000 people.' },
  { id: 'near-miss-2012', date: '2012-07-23', name: '2012 Near-Miss CME', peakKp: 0,  category: 'None', affectedRegions: [], economicImpact: '$2.6T (avoided)', durationHours: 0,  description: 'A Carrington-class CME erupted and missed Earth by 9 days. Had it hit, analysts estimate $2.6 trillion USD in damage. This event drove renewed interest in space weather preparedness globally.' },
  { id: 'g4-2024',     date: '2024-05-10', name: 'May 2024 G4 Storm',  peakKp: 8.3, category: 'G4', affectedRegions: ['Great Lakes Region', 'NE US Corridor', 'UK National Grid'], economicImpact: 'Minor', durationHours: 28, description: 'The strongest storm in two decades caused auroras visible as far south as Texas and Florida. Minor grid impacts were reported in North America, and some satellite operators noted increased drag.' },
  { id: 'dot-2003',    date: '2003-11-04', name: 'X28 Flare Event',    peakKp: 7.6, category: 'G3', affectedRegions: ['UK National Grid', 'Scandinavian Grid'], economicImpact: '$100M', durationHours: 18, description: 'The largest X-ray flare ever recorded (X28+) caused complete HF radio blackouts on the sunlit side of Earth for hours. Satellites in polar orbits experienced significant charging events.' },
];

export const MOCK_STATUS: SystemStatus = {
  dataFeedActive: false,
  lastUpdated:    new Date().toISOString(),
  modelVersion:   '2.1.0',
  replayMode:     true,
  apiLatencyMs:   0,
};
