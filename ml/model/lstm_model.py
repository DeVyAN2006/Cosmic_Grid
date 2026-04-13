import torch
import torch.nn as nn

# lstm_model.py — change the default
class KpLSTM(nn.Module):
    def __init__(self, input_size=7, hidden_size=96, num_layers=2, dropout=0.3):
        super(KpLSTM, self).__init__()

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout
        )

        # Regression head: predicts SYM/H value (storm intensity)
        self.regression_head = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(64, 1)
        )

        # Classification head: storm category (0=None, 1=Minor, 2=Moderate, 3=Strong, 4=Extreme)
        self.classification_head = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(64, 5)
        )

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_hidden  = lstm_out[:, -1, :]
        symh_pred    = self.regression_head(last_hidden).squeeze(-1)
        storm_class  = self.classification_head(last_hidden)
        return symh_pred, storm_class


def symh_to_storm_class(symh):
    """Map SYM/H index to storm category (mirrors NOAA G-scale)"""
    if symh > -30:    return 0  # No storm
    elif symh > -50:  return 1  # Minor  (G1)
    elif symh > -100: return 2  # Moderate (G2)
    elif symh > -200: return 3  # Strong (G3)
    else:             return 4  # Extreme (G4/G5)

STORM_LABELS = ["No Storm", "Minor (G1)", "Moderate (G2)", "Strong (G3)", "Extreme (G4/G5)"]
