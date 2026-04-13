import torch
import numpy as np
import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from model.lstm_model import KpLSTM

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_PATH = "ml/models/kp_lstm_best.pt"
ONNX_PATH  = "ml/models/kp_lstm.onnx"
SEQ_LEN    = 288
FEATURES   = 7
DEVICE     = torch.device("cpu")   # export on CPU — ONNX doesn't support MPS

# ── Load trained model ────────────────────────────────────────────────────────
model = KpLSTM(hidden_size=96, dropout=0.3).to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()
print(f"✅ Loaded model from {MODEL_PATH}")

# ── Dummy input for tracing ───────────────────────────────────────────────────
dummy_input = torch.randn(1, SEQ_LEN, FEATURES, dtype=torch.float32).to(DEVICE)

# ── Export ────────────────────────────────────────────────────────────────────
torch.onnx.export(
    model,
    dummy_input,
    ONNX_PATH,
    export_params=True,
    opset_version=17,
    do_constant_folding=True,
    input_names=["solar_wind_sequence"],
    output_names=["symh_pred", "storm_class_logits"],
    dynamic_axes={
        "solar_wind_sequence": {0: "batch_size"},
        "symh_pred":           {0: "batch_size"},
        "storm_class_logits":  {0: "batch_size"},
    }
)
print(f"✅ ONNX model exported to {ONNX_PATH}")

# ── Verify export ─────────────────────────────────────────────────────────────
import onnx
model_onnx = onnx.load(ONNX_PATH)
onnx.checker.check_model(model_onnx)
print("✅ ONNX model verified — graph is valid")

# ── Quick inference test ──────────────────────────────────────────────────────
import onnxruntime as ort
sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
test_input = np.random.randn(1, SEQ_LEN, FEATURES).astype(np.float32)
symh_out, storm_out = sess.run(None, {"solar_wind_sequence": test_input})

print(f"\n── Inference test ───────────────────────────────")
print(f"   Input shape      : {test_input.shape}")
print(f"   Sym-H prediction : {symh_out[0]:.4f} (normalized)")
print(f"   Storm class logits: {storm_out[0]}")
print(f"   Predicted class  : {int(np.argmax(storm_out[0]))}")
print(f"────────────────────────────────────────────────")
print(f"\n🎉 Export complete! Ready for FastAPI inference.")
