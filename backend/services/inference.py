import numpy as np
import onnxruntime as ort
import joblib
from datetime import datetime, timezone, timedelta

ONNX_PATH          = "ml/models/kp_lstm.onnx"
FEAT_SCALER_PATH   = "ml/models/feature_scaler.pkl"
TARGET_SCALER_PATH = "ml/models/target_scaler.pkl"

STORM_LABELS = ["No Storm", "Minor (G1)", "Moderate (G2)", "Strong (G3)", "Extreme (G4/G5)"]
ALERT_LEVELS = ["CALM", "ELEVATED", "ELEVATED", "SEVERE", "EXTREME"]
FEATURES     = ["bz_nT", "sw_speed", "proton_density", "proton_temp",
                "flow_pressure", "ae_index", "symh_index"]

# Load once at startup
sess          = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
feat_scaler   = joblib.load(FEAT_SCALER_PATH)
target_scaler = joblib.load(TARGET_SCALER_PATH)

# Kp ≈ f(Sym-H): rough empirical mapping used for the forecast curve
def _symh_to_kp(symh: float) -> float:
    """Approximate Kp from Sym-H (nT). Clamped 0-9."""
    if symh >= -10:  return max(0.0, 1.0 - symh * 0.05)
    if symh >= -30:  return 2.0 + abs(symh + 10) * 0.05
    if symh >= -50:  return 3.5 + abs(symh + 30) * 0.05
    if symh >= -100: return 5.0 + abs(symh + 50) * 0.04
    if symh >= -200: return 7.0 + abs(symh + 100) * 0.02
    return 9.0

def run_inference(cache: list[dict]) -> dict:
    """Run LSTM on the last 288 readings. Returns forecast dict + 48-h forecast series."""
    if len(cache) < 288:
        return _fallback_response("Insufficient data — need 288 readings (24h)")

    window   = cache[-288:]
    X_raw    = np.array([[r[f] for f in FEATURES] for r in window], dtype=np.float32)
    X_scaled = feat_scaler.transform(X_raw).reshape(1, 288, 7)

    symh_norm, storm_logits = sess.run(None, {"solar_wind_sequence": X_scaled})

    # Denormalize Sym-H prediction
    symh_real = float(target_scaler.inverse_transform([[symh_norm[0]]])[0][0])

    # Storm category
    storm_cat  = int(np.argmax(storm_logits[0]))
    logits     = storm_logits[0]
    exp_logits = np.exp(logits - np.max(logits))
    confidence = float(exp_logits[storm_cat] / exp_logits.sum())

    # ── 48-hour forecast series (one point every 2 hours = 24 steps) ──────────
    forecast_series = _generate_forecast_series(window, symh_real, confidence)

    return {
        "symh_predicted":  round(symh_real, 2),
        "storm_category":  storm_cat,
        "storm_label":     STORM_LABELS[storm_cat],
        "confidence":      round(confidence, 3),
        "alert_level":     ALERT_LEVELS[storm_cat],
        "forecast_series": forecast_series,
    }


def _generate_forecast_series(
    window: list[dict],
    symh_now: float,
    confidence: float,
) -> list[dict]:
    """
    Generate a 48-hour Kp forecast curve (24 points × 2-hour steps).

    Strategy: roll the LSTM forward autoregressively. At each step, shift
    the window by 24 readings (2 hours) and update symh_index with the
    previous prediction, then run inference again. This is computationally
    cheap because the ONNX session is already loaded.
    """
    now       = datetime.now(timezone.utc)
    series    = []
    cur_symh  = symh_now
    cur_window = [r.copy() for r in window]

    # Confidence widens over time — linear decay
    conf_decay = confidence / 24  # lose ~1 confidence unit per step

    for step in range(24):   # 24 steps × 2h = 48 hours
        ts = now + timedelta(hours=step * 2)

        kp          = _symh_to_kp(cur_symh)
        uncertainty = kp * (1 - max(0.0, confidence - conf_decay * step)) * 0.4
        upper       = min(9.0, round(kp + uncertainty, 2))
        lower       = max(0.0, round(kp - uncertainty, 2))

        series.append({
            "timestamp":   ts.isoformat(),
            "predictedKp": round(kp, 2),
            "upperBound":  upper,
            "lowerBound":  lower,
        })

        # Autoregressive step: update the window with predicted symh
        # Shift window forward by 24 rows (2 hours of 5-min readings)
        new_rows = []
        for i in range(24):
            base = cur_window[-(24 - i)]
            new_row = base.copy()
            new_row["symh_index"] = cur_symh
            new_rows.append(new_row)

        cur_window = cur_window[24:] + new_rows

        # Re-run LSTM on updated window to get next symh
        try:
            X_raw    = np.array([[r[f] for f in FEATURES] for r in cur_window],
                                dtype=np.float32)
            X_scaled = feat_scaler.transform(X_raw).reshape(1, 288, 7)
            symh_norm, _ = sess.run(None, {"solar_wind_sequence": X_scaled})
            cur_symh = float(target_scaler.inverse_transform([[symh_norm[0]]])[0][0])
        except Exception:
            # If autoregression fails, decay gently toward 0
            cur_symh *= 0.92

    return series


def _fallback_response(reason: str) -> dict:
    """Return a synthetic calm forecast when data is insufficient."""
    now    = datetime.now(timezone.utc)
    series = []
    for step in range(24):
        ts = now + timedelta(hours=step * 2)
        series.append({
            "timestamp":   ts.isoformat(),
            "predictedKp": 1.0,
            "upperBound":  1.5,
            "lowerBound":  0.5,
        })
    return {
        "symh_predicted":  0.0,
        "storm_category":  0,
        "storm_label":     "No Storm (insufficient data)",
        "confidence":      0.0,
        "alert_level":     "CALM",
        "forecast_series": series,
        "note":            reason,
    }