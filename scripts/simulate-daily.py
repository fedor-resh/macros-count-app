import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import pandas as pd
import numpy as np
from pathlib import Path

INPUT_FILE = Path(__file__).parent / "output" / "dataset-predicted.csv"
np.random.seed(42)

df = pd.read_csv(INPUT_FILE)
df["kcalories"] = pd.to_numeric(df["kcalories"], errors="coerce")
df["predicted_kcal"] = pd.to_numeric(df["predicted_kcal"], errors="coerce")
df = df.dropna(subset=["kcalories", "predicted_kcal"])
df = df[(df["predicted_kcal"] != -1) & (df["kcalories"] > 0) & (df["predicted_kcal"] > 0)]
df = df[df["class"] != "non_edible"]
df = df[(df["kcalories"] <= 700) & (df["predicted_kcal"] <= 700)]

actual = df["kcalories"].values
predicted = df["predicted_kcal"].values

N_SIMULATIONS = 10_000

print("Симуляция дневного рациона: суммирование случайных продуктов\n")
print(f"{'Продуктов/день':>16} {'MAPE дневн.':>12} {'MAE дневн.':>12} {'Median AE':>12} {'MAPE отд.прод':>14}")
print("-" * 70)

for meals_per_day in [3, 5, 7, 10]:
    daily_actual = []
    daily_predicted = []

    for _ in range(N_SIMULATIONS):
        idx = np.random.choice(len(actual), size=meals_per_day, replace=True)
        daily_actual.append(actual[idx].sum())
        daily_predicted.append(predicted[idx].sum())

    da = np.array(daily_actual)
    dp = np.array(daily_predicted)

    daily_mape = np.mean(np.abs(dp - da) / da) * 100
    daily_mae = np.mean(np.abs(dp - da))
    daily_median_ae = np.median(np.abs(dp - da))
    single_mape = np.mean(np.abs(predicted - actual) / actual) * 100

    print(f"{meals_per_day:>16} {daily_mape:>11.1f}% {daily_mae:>11.1f} {daily_median_ae:>11.1f} {single_mape:>13.1f}%")

print("\n" + "=" * 70)
print("Вывод: при суммировании N продуктов ошибки частично компенсируются.")
print("MAPE дневного рациона убывает пропорционально ~1/sqrt(N).\n")

# Show reduction factor
single = np.mean(np.abs(predicted - actual) / actual) * 100
for n in [3, 5, 7, 10]:
    idx_all = [np.random.choice(len(actual), size=n, replace=True) for _ in range(N_SIMULATIONS)]
    da = np.array([actual[i].sum() for i in idx_all])
    dp = np.array([predicted[i].sum() for i in idx_all])
    daily = np.mean(np.abs(dp - da) / da) * 100
    print(f"  {n} продуктов: MAPE {daily:.1f}% (снижение в {single/daily:.1f}x от {single:.1f}%)")
