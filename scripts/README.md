# Dataset Enrichment And Training Pipeline

> **⚠️ Не работает после Фазы 2 миграции на Go-бэкенд:** `export-dataset.ts`
> читает `eaten_products` через Supabase service role key, а данные переехали
> в собственный Postgres (см. `docs/10-go-backend-migration.md`). Перед
> следующим использованием пайплайна скрипт нужно переписать на прямое
> подключение к `DATABASE_URL` (npm-пакет `pg`). Остальные шаги пайплайна
> работают с локальными CSV и не затронуты.

This directory now contains the research pipeline for building an ML-ready dataset from food photos.

Current pipeline as of April 19, 2026:

1. `export-dataset.ts`
   Reads `id`, `imageUrl`, `kcalories` from Supabase `eaten_products`.
2. `classify-images.ts`
   Classifies each image into `nutrition_label`, `label`, `product`, `non_edible`.
3. `enrich-features.ts`
   Calls `google/gemini-2.5-flash` through OpenRouter and extracts structured nutrition and quality features into strict JSON.
4. `build-training-dataset.py`
   Filters valid rows, builds derived features and targets, and writes `training.csv`.

## What Was Added

### `enrich-features.ts`

Input:
- `scripts/output/dataset-classified.csv`

Output:
- `scripts/output/dataset-enriched.csv`

Behavior:
- Uses `response_format: { type: "json_object" }`
- Validates JSON structure and enums before writing
- Retries up to `3` times with backoff
- Runs with `CONCURRENCY = 10`
- Supports resume from an existing `dataset-enriched.csv`
- Skips LLM calls for `non_edible` and `error`
- Persists progress after every completed row

Output columns added:
- `llm_food_name`, `llm_image_class`
- `llm_calories`, `llm_protein`, `llm_fat`, `llm_carbs`, `llm_weight`
- `llm_confidence`, `llm_calorie_basis`
- `llm_text_readability`, `llm_portion_difficulty`, `llm_error_risk`
- `llm_is_single_item`, `llm_is_mixed_dish`
- `llm_error`

### `build-training-dataset.py`

Input:
- `scripts/output/dataset-enriched.csv`

Output:
- `scripts/output/training.csv`

Filters:
- `kcalories > 0`
- `class not in {"non_edible", "error"}`
- `llm_calories > 0`
- `llm_error == ""`

Derived features:
- `kcal_from_macros = 4*protein + 9*fat + 4*carbs`
- `macro_gap = llm_calories - kcal_from_macros`
- `macro_gap_pct = macro_gap / llm_calories * 100`

Targets:
- `signed_error_pct = (llm_calories - kcalories) / kcalories * 100`
- `abs_error_pct = abs(signed_error_pct)`
- `is_acceptable = abs_error_pct <= 10`

Encodings:
- `llm_confidence_ord`: `low=0`, `medium=1`, `high=2`
- `llm_text_readability_ord`: `none=0`, `low=1`, `medium=2`, `high=3`
- `llm_portion_difficulty_ord`: `low=0`, `medium=1`, `high=2`
- `llm_error_risk_ord`: `low=0`, `medium=1`, `high=2`

Leakage rule:
- `kcalories` is kept only as a reference column and is not part of the feature set.

## Commands

```bash
npm run dataset:export
npm run dataset:classify
npm run dataset:enrich
npm run dataset:training
```

For iterative runs, only these are needed:

```bash
npm run dataset:enrich
npm run dataset:training
```

`dataset:enrich` is resumable. Re-running it processes only rows without a valid parsed result.

## Current Run Snapshot

Source run date:
- April 19, 2026

Input dataset:
- `442` rows in `dataset-classified.csv`

Enrichment result:
- `440 / 442` rows parsed successfully
- `2 / 442` rows ended with `parse_error`
- Both parse-error rows (`id=291`, `id=293`) have empty `kcalories`, so they do not enter training

Training dataset result:
- `381` rows after filters
- Class distribution:
  - `nutrition_label`: `282`
  - `label`: `82`
  - `product`: `17`
- Overall acceptable-rate (`abs_error_pct <= 10`): `92.13%`
- Exact matches (`abs_error_pct == 0`): `221 / 381` or `58.01%`

Target summary:
- `signed_error_pct` mean: `2.08`
- `abs_error_pct` mean: `6.55`
- `abs_error_pct` median: `0.00`
- `abs_error_pct` p95: `54.84`

Feature completeness:
- `llm_protein`: `93.96%` filled
- `llm_fat`: `94.75%` filled
- `llm_carbs`: `93.96%` filled
- `llm_weight`: `79.53%` filled

## Result Analysis

### 1. The dataset is strong for label-reading, weaker for pure visual estimation

The final training set is dominated by `nutrition_label` rows (`282 / 381`). In the accepted training rows:
- `300` rows use `llm_calorie_basis = nutrition_table`
- `64` rows use `package_text`
- `15` rows use `visual_estimate`
- `2` rows use `mixed`

This means the current dataset is much stronger for OCR-like calorie extraction than for estimating calories from appearance alone.

### 2. Quality is high overall, but class-specific quality is uneven

Acceptable-rate by class:
- `label`: `96.34%`
- `nutrition_label`: `92.55%`
- `product`: `64.71%`

The `product` class is the weak point. The pipeline works well when text or nutrition facts are visible, and much less reliably when the model must infer calories from the food itself.

### 3. The confidence feature currently has low information density

`llm_confidence_ord` is almost constant:
- `high`: `373`
- `medium`: `7`
- `low`: `1`

That feature is still usable, but in the current snapshot it is unlikely to carry much signal for downstream ML because it has very little variance.

### 4. There is evidence that the original pre-classification is conservative

Among successfully enriched rows, `78` rows have a mismatch between source `class` and `llm_image_class`.
Most of them are:
- `label -> product`: `64`
- `label -> nutrition_label`: `13`

That suggests many packaging shots classified upstream as generic `label` still contain enough visual information for the enrichment model to infer a visible product or readable nutrition table.

### 5. Heavy-tail errors remain and likely come from source-data quality plus OCR mistakes

The median absolute error is `0`, but the p95 absolute error is already `54.84%`, and the worst case reaches `359%`.

Largest observed issues include:
- Rows where the LLM likely read nutrition data incorrectly from the image
- Rare very large actual values in the source data, including one row with `kcalories = 2260`

That `2260` value is a clear outlier candidate for per-100g nutrition data and should be reviewed before model training.

## Files Produced

- `scripts/output/dataset-enriched.csv`
- `scripts/output/training.csv`

These are the current artifacts used for downstream sklearn or XGBoost experiments.
