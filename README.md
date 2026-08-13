# Bite

Frontend app plus research scripts for building and evaluating food-photo datasets.

## Как запустить

Локальный запуск для разработки и развёртывание на VPS описаны в [DEPLOYMENT.md](DEPLOYMENT.md).

## Dataset Pipeline

The research pipeline for dataset enrichment and ML dataset assembly is documented in [scripts/README.md](scripts/README.md).

Main commands:

- `npm run dataset:export`
- `npm run dataset:classify`
- `npm run dataset:enrich`
- `npm run dataset:training`
- `npm run dataset:metrics`

Current generated artifacts:

- [scripts/output/dataset-enriched.csv](scripts/output/dataset-enriched.csv)
- [scripts/output/training.csv](scripts/output/training.csv)

## App Development

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run typecheck`
- `npm run lint`
- `npm run test` — watch-режим Vitest
- `npm run test:run` — одноразовый прогон
- `npm run test:coverage` — прогон с отчётом покрытия (v8)

## Курсовая работа

Документация по дисциплине «Разработка программного продукта» собрана в каталоге [docs/](docs/):

1. [docs/01-domain-area.md](docs/01-domain-area.md) — предметная область, глоссарий, бизнес-цели
2. [docs/02-requirements.md](docs/02-requirements.md) — функциональные / нефункциональные требования, ограничения, use-cases
3. [docs/03-domain-model.md](docs/03-domain-model.md) — UML-диаграмма классов и ER-схема
4. [docs/04-quality-metrics.md](docs/04-quality-metrics.md) — целевые метрики качества (ГОСТ Р ИСО/МЭК 25010)
5. [docs/05-architecture.md](docs/05-architecture.md) — C4-диаграммы (Context / Container / Component), потоки данных
6. [docs/06-design-patterns.md](docs/06-design-patterns.md) — три GoF-паттерна (Factory Method / Adapter / Strategy) с фрагментами «до/после»
7. [docs/07-testing-strategy.md](docs/07-testing-strategy.md) — стратегия тестирования и таблица сценариев TC-01…TC-31
8. [docs/08-test-report.md](docs/08-test-report.md) — отчёт по прогону тестов и покрытию
9. [docs/09-actual-metrics.md](docs/09-actual-metrics.md) — фактические метрики vs целевые

### Применённые шаблоны проектирования

| Категория | Шаблон | Реализация |
|-----------|--------|------------|
| Порождающий | **Factory Method** | [backend/internal/analysis/openrouter.go](backend/internal/analysis/openrouter.go) — интерфейс `LLM` + `NewOpenRouterClient` |
| Структурный | **Adapter** | [backend/internal/analysis/parser.go](backend/internal/analysis/parser.go) — нормализация ответа LLM к `FoodAnalysis` |
| Поведенческий | **Strategy** | [src/utils/bmrStrategy.ts](src/utils/bmrStrategy.ts) — `MifflinStJeorStrategy` / `HarrisBenedictStrategy` |

### Контрольная команда

```bash
npm run typecheck && npm run test:coverage && npm run build
```
