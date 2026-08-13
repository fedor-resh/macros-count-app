import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from pathlib import Path

INPUT_FILE = Path(__file__).parent / "output" / "dataset-predicted.csv"
OUTPUT_DIR = Path(__file__).parent / "output"

# ── Load ──────────────────────────────────────────────────────────────────────
df = pd.read_csv(INPUT_FILE)

# Keep only rows with valid numeric actual + predicted kcalories
df["kcalories"] = pd.to_numeric(df["kcalories"], errors="coerce")
df["predicted_kcal"] = pd.to_numeric(df["predicted_kcal"], errors="coerce")
df = df.dropna(subset=["kcalories", "predicted_kcal"])
df = df[df["predicted_kcal"] != -1]            # model couldn't estimate
df = df[df["kcalories"] > 0]                   # skip zero actual (bad data)
df = df[df["predicted_kcal"] > 0]
df = df[df["class"] != "non_edible"]           # exclude non-food images
df = df[df["kcalories"] <= 700]                # remove outliers above 700 kcal/100g
df = df[df["predicted_kcal"] <= 700]

actual = df["kcalories"].values
predicted = df["predicted_kcal"].values
errors = predicted - actual

# ── Metrics ───────────────────────────────────────────────────────────────────
mae   = mean_absolute_error(actual, predicted)
rmse  = np.sqrt(mean_squared_error(actual, predicted))
mape  = np.mean(np.abs(errors / actual)) * 100
r2    = r2_score(actual, predicted)
bias  = np.mean(errors)           # positive = model overestimates on average
med_ae = np.median(np.abs(errors))

print("=" * 45)
print(f"  Строк для анализа : {len(df)}")
print(f"  MAE               : {mae:.1f} kcal")
print(f"  Median AE         : {med_ae:.1f} kcal")
print(f"  RMSE              : {rmse:.1f} kcal")
print(f"  MAPE              : {mape:.1f}%")
print(f"  R²                : {r2:.3f}")
print(f"  Bias (mean error) : {bias:+.1f} kcal  ({'переоценка' if bias > 0 else 'недооценка'})")
print("=" * 45)

# ── Per-class metrics ─────────────────────────────────────────────────────────
print("\nМетрики по классам:")
print(f"{'Класс':<18} {'N':>5} {'MAE':>8} {'RMSE':>8} {'MAPE':>8} {'R²':>7}")
print("-" * 57)
for cls, grp in df.groupby("class"):
    a = grp["kcalories"].values
    p = grp["predicted_kcal"].values
    if len(a) < 2:
        continue
    cls_mae  = mean_absolute_error(a, p)
    cls_rmse = np.sqrt(mean_squared_error(a, p))
    cls_mape = np.mean(np.abs((p - a) / a)) * 100
    cls_r2   = r2_score(a, p)
    print(f"{cls:<18} {len(a):>5} {cls_mae:>8.1f} {cls_rmse:>8.1f} {cls_mape:>7.1f}% {cls_r2:>7.3f}")

# ── Plots ─────────────────────────────────────────────────────────────────────
CLASS_COLORS = {
    "nutrition_label": "#4C9BE8",
    "label":           "#F5A623",
    "product":         "#7ED321",
    "non_edible":      "#9B59B6",
}
colors = df["class"].map(CLASS_COLORS).fillna("#AAAAAA")

# Separate figure: scatter predicted vs actual (no title)
np.random.seed(42)
jitter = 8
lim = max(actual.max(), predicted.max()) * 1.05
fig_scatter = plt.figure(figsize=(8, 8))
ax_scatter = fig_scatter.add_subplot(111)
ax_scatter.scatter(
    actual + np.random.uniform(-jitter, jitter, len(actual)),
    predicted + np.random.uniform(-jitter, jitter, len(predicted)),
    c=colors, alpha=0.55, s=28, edgecolors="none",
)
ax_scatter.plot([0, lim], [0, lim], "k--", lw=1.2, label="идеал")
ax_scatter.set_xlabel("Фактическая калорийность (kcal/100g)")
ax_scatter.set_ylabel("Предсказанная калорийность (kcal/100g)")
ax_scatter.set_xlim(0, lim)
ax_scatter.set_ylim(0, lim)
from matplotlib.lines import Line2D
legend_handles = [
    Line2D([0], [0], marker="o", color="w", markerfacecolor=c, markersize=8, label=cls)
    for cls, c in CLASS_COLORS.items() if cls in df["class"].values
]
ax_scatter.legend(handles=legend_handles, loc="upper left", fontsize=8)
ax_scatter.grid(alpha=0.25)
fig_scatter.savefig(OUTPUT_DIR / "scatter-pred-vs-actual.png", dpi=150, bbox_inches="tight")
plt.close(fig_scatter)

# Main figure: metrics, error distribution, MAPE
fig = plt.figure(figsize=(12, 8))
fig.suptitle("Метрики качества предсказания калорийности нейросетью", fontsize=15, fontweight="bold", y=0.98)
gs = gridspec.GridSpec(2, 2, figure=fig, hspace=0.42, wspace=0.35)

# 1. Metrics text box
ax2 = fig.add_subplot(gs[0, 0])
ax2.axis("off")
metrics_text = (
    f"N = {len(df)}\n\n"
    f"MAE       {mae:.1f} kcal\n"
    f"Median AE {med_ae:.1f} kcal\n"
    f"RMSE      {rmse:.1f} kcal\n"
    f"MAPE      {mape:.1f}%\n"
    f"R²        {r2:.3f}\n"
    f"Bias      {bias:+.1f} kcal"
)
ax2.text(0.1, 0.55, metrics_text, transform=ax2.transAxes,
         fontsize=12, verticalalignment="center", fontfamily="monospace",
         bbox=dict(boxstyle="round,pad=0.6", facecolor="#f0f4ff", edgecolor="#aac0ee", linewidth=1.5))
ax2.set_title("Общие метрики")

# 2. Error distribution histogram
ax3 = fig.add_subplot(gs[0, 1])
ax3.hist(errors, bins=40, color="#4C9BE8", edgecolor="white", linewidth=0.4, alpha=0.85)
ax3.axvline(0, color="black", lw=1.2, ls="--")
ax3.axvline(bias, color="red", lw=1.2, ls="-", label=f"bias={bias:+.1f}")
ax3.set_xlabel("Ошибка (predicted − actual)")
ax3.set_ylabel("Количество")
ax3.set_title("Распределение ошибок")
ax3.legend(fontsize=8)
ax3.grid(alpha=0.2)

# 3. MAPE by class (bar)
class_order = [c for c in CLASS_COLORS if c in df["class"].values]
ax5 = fig.add_subplot(gs[1, :])
mape_by_class = {
    cls: np.mean(np.abs((df[df["class"] == cls]["predicted_kcal"].values -
                          df[df["class"] == cls]["kcalories"].values) /
                         df[df["class"] == cls]["kcalories"].values)) * 100
    for cls in class_order
}
bars = ax5.bar(class_order, [mape_by_class[c] for c in class_order],
               color=[CLASS_COLORS[c] for c in class_order], alpha=0.8, edgecolor="white")
ax5.axhline(mape, color="black", lw=1.2, ls="--", label=f"общий MAPE {mape:.1f}%")
for bar, cls in zip(bars, class_order):
    ax5.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1,
             f"{mape_by_class[cls]:.1f}%", ha="center", va="bottom", fontsize=8)
ax5.set_ylabel("MAPE (%)")
ax5.set_title("MAPE по классам")
ax5.set_xticks(range(len(class_order)))
ax5.set_xticklabels(class_order, rotation=15, ha="right", fontsize=8)
ax5.legend(fontsize=8)
ax5.grid(alpha=0.2, axis="y")

out_path = OUTPUT_DIR / "metrics.png"
plt.savefig(out_path, dpi=150, bbox_inches="tight")
plt.close()
print(f"\nГрафики сохранены:")
print(f"  {OUTPUT_DIR / 'scatter-pred-vs-actual.png'}")
print(f"  {out_path}")
