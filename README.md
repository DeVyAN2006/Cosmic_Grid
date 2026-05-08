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

The 1989 Quebec solar storm left **6 million people without power**. Solar storms induce powerful currents in transmission lines — yet most grid operators have no real-time early warning system.

CosmicGrid changes that.

---

## 📡 What It Does

- 🔴 Polls NOAA's solar wind APIs every **5 minutes**
- 🧠 Forecasts storm intensity using an **LSTM model** (G0–G5 classification)
- 🗺️ Scores **13 global grid regions** for real-time risk (0–100)
- ⚡ Generates **AI-powered emergency response plans** via LLaMA 3.3 70B
- 🌍 Visualizes everything on an **interactive 3D globe**
- 🔌 Pushes live data to all clients via **WebSocket**

---

## 🏗️ Architecture

```
NOAA API → FastAPI Backend → LSTM Inference → Risk Engine → Groq AI
                                                               ↓
                          React Frontend ← WebSocket ← PostgreSQL
```

---

## 🧮 Risk Levels

| Score | Alert |
|-------|-------|
| 0–29 | 🟢 SAFE |
| 30–49 | 🟡 LOW-MODERATE |
| 50–74 | 🟠 MODERATE |
| 75–100 | 🔴 HIGH |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React, Vite, TypeScript |
| **Backend** | FastAPI, APScheduler |
| **ML** | LSTM, Sentence Transformers |
| **AI** | Groq — LLaMA 3.3 70B |
| **Database** | PostgreSQL via Supabase |

---

## 🙏 Acknowledgements

[NOAA SWPC](https://www.swpc.noaa.gov/) · [Groq](https://groq.com/) · [FastAPI](https://fastapi.tiangolo.com/) · [Supabase](https://supabase.com/)

---

## 👤 Author

**Devyan Nitharwal** — [@DeVyAN2006](https://github.com/DeVyAN2006)

---

<div align="center">

Built with ❤️ for **Techno Tarang 2026** · Poornima Engineering College

*Protecting the grid, one solar flare at a time.*

</div>
