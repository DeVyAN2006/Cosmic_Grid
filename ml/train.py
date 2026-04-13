import torch
import torch.nn as nn
import numpy as np
import time
from torch.utils.data import DataLoader, TensorDataset
import sys, os
import joblib

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from model.lstm_model import KpLSTM, symh_to_storm_class

# ── Config ────────────────────────────────────────────────────────────────────
EPOCHS     = 20
BATCH_SIZE = 512
LR         = 1e-4
PATIENCE   = 5

DEVICE = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print(f"Training on: {DEVICE}")

# ── Load scalers ──────────────────────────────────────────────────────────────
target_scaler = joblib.load("ml/models/target_scaler.pkl")
target_std    = float(target_scaler.scale_[0])  # for RMSE → nT

# ── Load data ─────────────────────────────────────────────────────────────────
X_train = torch.tensor(np.load("ml/data/processed/X_train.npy"), dtype=torch.float32)
y_train = torch.tensor(np.load("ml/data/processed/y_train.npy"), dtype=torch.float32)
X_val   = torch.tensor(np.load("ml/data/processed/X_val.npy"),   dtype=torch.float32)
y_val   = torch.tensor(np.load("ml/data/processed/y_val.npy"),   dtype=torch.float32)

# ── Build storm class labels from REAL Sym-H (inverse transform) ─────────────
y_train_real = target_scaler.inverse_transform(y_train.numpy().reshape(-1, 1)).ravel()
y_val_real   = target_scaler.inverse_transform(y_val.numpy().reshape(-1, 1)).ravel()

y_class_train = torch.tensor(
    [symh_to_storm_class(k) for k in y_train_real], dtype=torch.long
)
y_class_val = torch.tensor(
    [symh_to_storm_class(k) for k in y_val_real], dtype=torch.long
)

print(f"Train: {len(X_train):,} samples | Val: {len(X_val):,} samples")

train_loader = DataLoader(
    TensorDataset(X_train, y_train, y_class_train),
    batch_size=BATCH_SIZE, shuffle=True
)
val_loader = DataLoader(
    TensorDataset(X_val, y_val, y_class_val),
    batch_size=BATCH_SIZE, shuffle=False
)

# ── Model ─────────────────────────────────────────────────────────────────────
model = KpLSTM(hidden_size=96, dropout=0.3).to(DEVICE)

mse_loss  = nn.MSELoss()
ce_loss   = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)

scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='min', patience=3, factor=0.5
)

print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}\n")

# ── Training loop ─────────────────────────────────────────────────────────────
best_val_loss    = float("inf")
patience_counter = 0
os.makedirs("ml/models", exist_ok=True)

for epoch in range(EPOCHS):
    epoch_start = time.time()

    # ── Train phase ───────────────────────────────────────────────────────────
    model.train()
    train_losses = []
    train_mse_list, train_ce_list = [], []

    for X_batch, y_reg, y_cls in train_loader:
        X_batch = X_batch.to(DEVICE)
        y_reg   = y_reg.to(DEVICE)
        y_cls   = y_cls.to(DEVICE)

        optimizer.zero_grad()
        symh_pred, storm_pred = model(X_batch)

        mse_t = mse_loss(symh_pred, y_reg)
        ce_t  = ce_loss(storm_pred, y_cls)
        loss  = mse_t + 0.3 * ce_t

        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        train_losses.append(loss.item())
        train_mse_list.append(mse_t.item())
        train_ce_list.append(ce_t.item())

    # ── Validation phase ──────────────────────────────────────────────────────
    model.eval()
    val_loss_list = []
    val_mse_list  = []
    val_ce_list   = []

    with torch.no_grad():
        for X_batch, y_reg, y_cls in val_loader:
            X_batch = X_batch.to(DEVICE)
            y_reg   = y_reg.to(DEVICE)
            y_cls   = y_cls.to(DEVICE)

            symh_pred, storm_pred = model(X_batch)

            mse_v = mse_loss(symh_pred, y_reg)
            ce_v  = ce_loss(storm_pred, y_cls)
            loss_v = mse_v + 0.3 * ce_v

            val_loss_list.append(loss_v.item())
            val_mse_list.append(mse_v.item())
            val_ce_list.append(ce_v.item())

    # ── Metrics ───────────────────────────────────────────────────────────────
    avg_train     = np.mean(train_losses)
    avg_train_mse = np.mean(train_mse_list)
    avg_train_ce  = np.mean(train_ce_list)

    avg_val       = np.mean(val_loss_list)
    avg_val_mse   = np.mean(val_mse_list)
    avg_val_ce    = np.mean(val_ce_list)
    avg_rmse      = np.sqrt(avg_val_mse)          # normalized units
    rmse_nT       = avg_rmse * target_std         # back to nT

    elapsed       = time.time() - epoch_start
    remaining_min = elapsed * (EPOCHS - epoch - 1) / 60

    # Scheduler steps on normalized RMSE (fine)
    scheduler.step(avg_rmse)
    current_lr = optimizer.param_groups[0]['lr']

    print(
        f"Epoch {epoch+1:2d}/{EPOCHS} | "
        f"Train: {avg_train:.4f} (MSE:{avg_train_mse:.2f} CE:{avg_train_ce:.3f}) | "
        f"Val: {avg_val:.4f} (MSE:{avg_val_mse:.2f} CE:{avg_val_ce:.3f}) | "
        f"RMSE: {rmse_nT:.2f} nT | "  # <- now real nT
        f"LR: {current_lr:.2e} | "
        f"⏱ {elapsed/60:.1f}min | ETA: {remaining_min:.0f}min"
    )

    # ── Checkpoint + early stopping ───────────────────────────────────────────
    if avg_val < best_val_loss:
        best_val_loss = avg_val
        torch.save(model.state_dict(), "ml/models/kp_lstm_best.pt")
        print("           ✅ Best model saved!")
        patience_counter = 0
    else:
        patience_counter += 1
        print(f"           ⏳ No improvement ({patience_counter}/{PATIENCE})")
        if patience_counter >= PATIENCE:
            print("🛑 Early stopping triggered — best model already saved.")
            break

print("\n🎉 Training complete!")
print(f"Best val loss : {best_val_loss:.4f}")
print("Model saved to: ml/models/kp_lstm_best.pt")
