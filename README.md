<div align="center">

# 🌌 CosmicGrid

### AI-Powered Space Weather Intelligence for Energy Grid Resilience

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*Real-time geomagnetic storm monitoring and AI-driven risk assessment for global power grid infrastructure.*

</div>

---

## ⚡ The Problem

On March 13, 1989, a geomagnetic storm triggered by a solar eruption knocked out power to **6 million people in Quebec** for over 9 hours — in temperatures well below freezing. Transformers melted. The grid collapsed in under 90 seconds.

That wasn't a freak accident. It was a preview.

Solar storms induce powerful electrical currents in long transmission lines — a phenomenon known as **Geomagnetically Induced Currents (GIC)**. A single extreme event today could cause cascading failures across interconnected grids, leaving millions without power for days or even weeks. The threat is real, growing, and largely invisible.

Yet most grid operators still have **no real-time early warning system** for space weather events.

CosmicGrid changes that.

---

## 📡 What Is CosmicGrid?

CosmicGrid is a full-stack space weather intelligence platform that monitors live solar activity, predicts incoming geomagnetic storms, and tells grid operators exactly what to do — before the damage happens.

It doesn't just show data. It interprets it, scores the risk, and generates actionable emergency plans — all in real time.

---

## ✨ What It Does

- 🔴 Polls **NOAA's solar wind APIs** every 5 minutes for live plasma and magnetometer data
- 🧠 Forecasts storm intensity using an **LSTM model** with G0–G5 storm classification and 12-step ahead predictions
- 🗺️ Scores **13 global grid regions** in real-time based on latitude, line length, grid age, and live solar parameters
- ⚡ Generates **AI-powered emergency response plans** per region using LLaMA 3.3 70B via Groq
- 🌍 Visualizes all risk data on an **interactive 3D globe** with live overlays
- 📊 Displays live charts for **Bz, solar wind speed, proton density, and flow pressure**
- 🗄️ Maintains a curated **historical storm archive** for reference and trend analysis
- 🔌 Pushes live updates to all connected clients via **WebSocket** — no refresh needed
- 🛡️ Frontend preserves last known state during connectivity loss — **no blank screens**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)                 │
│   Dashboard │ Globe │ Scorecard │ Monitor │ Archive      │
└──────────────────────┬──────────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                    Backend (FastAPI)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ NOAA Client │  │  Inference   │  │  Risk Engine   │  │
│  │  (httpx)    │  │ (LSTM model) │  │  (Scorer)      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         └────────────────┴───────────────────┘           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │             APScheduler (5-min polling)             │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │         Groq API  ·  LLaMA 3.3 70B                  │ │
│  │         Action Plan Generation                      │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy Async
┌──────────────────────▼──────────────────────────────────┐
│                PostgreSQL (via Supabase)                  │
│   SolarReadings │ Forecasts │ RegionAlerts │ ActionPlans  │
└─────────────────────────────────────────────────────────┘
```

---

## 🧮 Risk Scoring

Each region is scored 0–100 using a weighted formula that combines live solar parameters with regional vulnerability factors:

```
score = base_score
      + (bz_factor × 0.50 + speed_factor × 0.35 + density_factor × 0.15) × 25
      + region_weight × storm_multiplier
```

| Factor | What It Captures |
|--------|-----------------|
| `bz_factor` | Southward Bz component — primary driver of GIC intensity |
| `speed_factor` | High solar wind speed amplifies geomagnetic impact |
| `density_factor` | Proton density adds dynamic pressure to the magnetosphere |
| `region_weight` | Accounts for latitude, transmission line length, and grid age |

| Score | Alert Level |
|-------|-------------|
| 0–29 | 🟢 SAFE |
| 30–49 | 🟡 LOW-MODERATE |
| 50–74 | 🟠 MODERATE |
| 75–100 | 🔴 HIGH |

---

## 🧠 ML Model

The forecasting engine uses an **LSTM (Long Short-Term Memory)** model trained on historical solar wind and geomagnetic index data.

**Input — last 24h rolling window:**
- Bz component (nT), Solar wind speed (km/s), Proton density (p/cm³)
- Flow pressure (nPa), AE index, Sym-H index

**Output:**

| Field | Description |
|-------|-------------|
| `symh_predicted` | Predicted Sym-H index (nT) |
| `storm_category` | G0 to G5 (NOAA storm scale) |
| `confidence` | Model confidence score (0–1) |
| `alert_level` | Minimal / Minor / Moderate / Strong / Extreme |
| `forecast_series` | 12-step ahead predictions |

---

## 🌍 Monitored Regions

| Region | Country | Latitude | Risk Factor |
|--------|---------|----------|-------------|
| Scandinavia | Norway/Sweden | 63°N | Highest latitude monitored |
| Western Russia | Russia | 58°N | 220,000 km transmission lines |
| Quebec Grid | Canada | 53°N | 1989 blackout history |
| Ontario Grid | Canada | 51°N | Dense urban load |
| UK Grid | United Kingdom | 54°N | Aging infrastructure |
| US Northeast | USA | 43°N | High population density |
| US Midwest | USA | 42°N | 180,000 km transmission lines |
| Northern China | China | 42°N | 200,000 km line length |
| Japan | Japan | 36°N | Island grid, no interconnect buffer |
| India North | India | 28°N | 500M population served |
| Australia East | Australia | -33°S | Southern hemisphere exposure |
| Brazil South | Brazil | -23°S | Growing industrial load |
| South Africa | South Africa | -29°S | Southern hemisphere exposure |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React, Vite, TypeScript |
| **Backend** | FastAPI, APScheduler, httpx |
| **ML** | LSTM, Sentence Transformers |
| **AI** | Groq — LLaMA 3.3 70B |
| **Database** | PostgreSQL via Supabase, SQLAlchemy Async |

---

## 🔮 Future Work

- [ ] Expand monitored regions beyond current 13
- [ ] Retrain LSTM on longer historical solar wind datasets
- [ ] Add SMS / email alerting for critical risk thresholds
- [ ] Build a public API for researchers and grid operators
- [ ] Integrate satellite imagery for visual storm tracking

---

## 🙏 Acknowledgements

- [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/) — Real-time solar wind data
- [Groq](https://groq.com/) — Ultra-fast LLaMA 3.3 70B inference
- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [Supabase](https://supabase.com/) — Managed PostgreSQL database

---

## 👤 Author

**Devyan Nitharwal** — [@DeVyAN2006](https://github.com/DeVyAN2006)
