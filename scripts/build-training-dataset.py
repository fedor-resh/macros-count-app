import csv
import io
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

INPUT_FILE = Path(__file__).parent / "output" / "dataset-enriched.csv"
OUTPUT_FILE = Path(__file__).parent / "output" / "training.csv"

NUMERIC_COLUMNS = [
    "kcalories",
    "llm_calories",
    "llm_protein",
    "llm_fat",
    "llm_carbs",
    "llm_weight",
]

BOOL_COLUMNS = ["llm_is_single_item", "llm_is_mixed_dish"]

CONFIDENCE_MAP = {"low": 0, "medium": 1, "high": 2}
READABILITY_MAP = {"none": 0, "low": 1, "medium": 2, "high": 3}
LEVEL3_MAP = {"low": 0, "medium": 1, "high": 2}

FEATURE_COLUMNS = [
    "class",
    "llm_calories",
    "llm_protein",
    "llm_fat",
    "llm_carbs",
    "llm_weight",
    "kcal_from_macros",
    "macro_gap",
    "macro_gap_pct",
    "llm_confidence_ord",
    "llm_calorie_basis",
    "llm_text_readability_ord",
    "llm_portion_difficulty_ord",
    "llm_error_risk_ord",
    "llm_is_single_item",
    "llm_is_mixed_dish",
]

TARGET_COLUMNS = ["signed_error_pct", "abs_error_pct", "is_acceptable"]
REFERENCE_COLUMNS = ["kcalories"]
FINAL_COLUMNS = ["id", *FEATURE_COLUMNS, *TARGET_COLUMNS, *REFERENCE_COLUMNS]


def parse_bool(value):
    if pd.isna(value):
        return np.nan
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"true", "1", "yes"}:
        return True
    if text in {"false", "0", "no"}:
        return False
    return np.nan


def print_series(title: str, series: pd.Series) -> None:
    print(title)
    if series.empty:
        print("  <empty>")
        return
    for key, value in series.items():
        print(f"  {key}: {value}")


def main():
    if not INPUT_FILE.exists():
        raise SystemExit(f"Input file not found: {INPUT_FILE}")

    df = pd.read_csv(INPUT_FILE)
    before_filters = len(df)

    for column in NUMERIC_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    for column in BOOL_COLUMNS:
        df[column] = df[column].map(parse_bool)

    df["llm_error"] = df["llm_error"].fillna("").astype(str).str.strip()
    df["class"] = df["class"].fillna("").astype(str).str.strip()
    df["llm_confidence"] = df["llm_confidence"].fillna("").astype(str).str.strip()
    df["llm_calorie_basis"] = df["llm_calorie_basis"].fillna("").astype(str).str.strip()
    df["llm_text_readability"] = df["llm_text_readability"].fillna("").astype(str).str.strip()
    df["llm_portion_difficulty"] = df["llm_portion_difficulty"].fillna("").astype(str).str.strip()
    df["llm_error_risk"] = df["llm_error_risk"].fillna("").astype(str).str.strip()

    filtered = df[
        (df["kcalories"] > 0)
        & (~df["class"].isin({"non_edible", "error"}))
        & (df["llm_calories"] > 0)
        & (df["llm_error"] == "")
    ].copy()

    after_filters = len(filtered)

    filtered["kcal_from_macros"] = (
        4 * filtered["llm_protein"].fillna(0)
        + 9 * filtered["llm_fat"].fillna(0)
        + 4 * filtered["llm_carbs"].fillna(0)
    )
    filtered["macro_gap"] = filtered["llm_calories"] - filtered["kcal_from_macros"]
    filtered["macro_gap_pct"] = np.where(
        filtered["llm_calories"] > 0,
        filtered["macro_gap"] / filtered["llm_calories"] * 100,
        np.nan,
    )

    filtered["signed_error_pct"] = (
        (filtered["llm_calories"] - filtered["kcalories"]) / filtered["kcalories"] * 100
    )
    filtered["abs_error_pct"] = filtered["signed_error_pct"].abs()
    filtered["is_acceptable"] = filtered["abs_error_pct"] <= 10

    filtered["llm_confidence_ord"] = filtered["llm_confidence"].map(CONFIDENCE_MAP)
    filtered["llm_text_readability_ord"] = filtered["llm_text_readability"].map(READABILITY_MAP)
    filtered["llm_portion_difficulty_ord"] = filtered["llm_portion_difficulty"].map(LEVEL3_MAP)
    filtered["llm_error_risk_ord"] = filtered["llm_error_risk"].map(LEVEL3_MAP)

    training = filtered[FINAL_COLUMNS].copy()
    training.to_csv(OUTPUT_FILE, index=False, quoting=csv.QUOTE_MINIMAL)

    print("=" * 60)
    print("Training dataset summary")
    print("=" * 60)
    print(f"Rows before filters: {before_filters}")
    print(f"Rows after filters : {after_filters}")
    print(f"Output             : {OUTPUT_FILE}")
    print()

    print_series("Class distribution:", training["class"].value_counts())
    print()

    print("Target describe():")
    target_describe = training[TARGET_COLUMNS].describe(include="all").transpose()
    print(target_describe.to_string())
    print()

    feature_leakage = [column for column in FEATURE_COLUMNS if column == "kcalories"]
    print(f"Leakage check (kcalories in features): {'FAILED' if feature_leakage else 'OK'}")
    print(f"Feature columns: {', '.join(FEATURE_COLUMNS)}")


if __name__ == "__main__":
    main()
