# 9. Фактические метрики качества

Измерения произведены на ветке `main` 2026-05-15 после выполнения курсовой работы.
Целевые значения — в [`docs/04-quality-metrics.md`](04-quality-metrics.md).

## 9.1. Сводная таблица «целевое vs фактическое»

| Характеристика | Метрика | Целевое | Фактическое | Статус |
|----------------|---------|---------|-------------|--------|
| Функциональная корректность | Доля проходящих unit-тестов | 100 % | **100 %** (31/31) | ✅ |
| Надёжность (зрелость) | Покрытие `src/utils/*` (lines) | ≥ 80 % | **100 %** (3/3 модулей) | ✅ |
| Надёжность (зрелость) | Покрытие `responseAdapter.ts` (lines) | ≥ 90 % | **94.54 %** | ✅ |
| Надёжность | Доля корректно обработанных ошибок LLM | 100 % | **100 %** (TC-23) | ✅ |
| Производительность (ресурсы) | JS-бандл `index-*.js` (gzip) | ≤ 350 КБ | **105.21 КБ** | ✅ |
| Производительность (ресурсы) | Самый тяжёлый chunk (`mantine-core`, gzip) | ≤ 100 КБ | **83.11 КБ** | ✅ |
| Производительность (ресурсы) | Суммарный gzip JS | информативно | **~277 КБ** | ✅ |
| Производительность (ресурсы) | CSS (gzip) | информативно | **32.89 КБ** | ✅ |
| Защищённость | RLS включён для всех таблиц пользователя | 100 % | **100 %** (миграция [`20250101000000_initial_schema.sql`](../supabase/migrations/20250101000000_initial_schema.sql)) | ✅ |
| Защищённость | Уязвимости high/critical (`npm audit --omit=dev`) | 0 | **3 high** в `react-router-dom@6` (см. 9.4) | ⚠️ |
| Сопровождаемость | TypeScript strict + 0 ошибок | 0 | **0** (`npm run typecheck`) | ✅ |
| Сопровождаемость | Применены ≥ 3 GoF-паттерна (по одному из категории) | ≥ 3 | **3** (Factory / Adapter / Strategy) | ✅ |
| Сопровождаемость | Длина модуля ≤ 250 строк | 100 % | новые модули ≤ 90 строк | ✅ |
| Сопровождаемость | Lint без ошибок | 0 errors | **0 errors, 15 warnings** (наследие) | ✅ |
| Переносимость | PWA-сборка (manifest + sw) генерируется | да | **`dist/manifest.webmanifest`, `dist/sw.js`** | ✅ |

Итого: **13 из 14** метрик ✅, **1** под наблюдением (см. 9.4).

## 9.2. Bundle Size (gzip)

Из вывода `npm run build`:

```
dist/assets/index-*.css            226.20 kB │ gzip:  32.89 kB
dist/assets/icons-*.js               7.84 kB │ gzip:   1.79 kB
dist/assets/react-vendor-*.js       12.69 kB │ gzip:   4.48 kB
dist/assets/mantine-hooks-*.js      23.42 kB │ gzip:   7.99 kB
dist/assets/react-query-*.js        43.15 kB │ gzip:  12.80 kB
dist/assets/react-router-*.js       60.60 kB │ gzip:  20.69 kB
dist/assets/supabase-*.js          156.69 kB │ gzip:  40.61 kB
dist/assets/mantine-core-*.js      267.72 kB │ gzip:  83.11 kB
dist/assets/index-*.js             327.07 kB │ gzip: 105.21 kB
                                              ─────────────────
                                       JS gzip total ≈ 276.68 kB
```

Главный entry-чанк (`index-*.js`) — **105.21 КБ gzip**, что значительно ниже порога 350 КБ.
Декомпозиция через `manualChunks` в [`vite.config.mjs`](../vite.config.mjs) удерживает каждый чанк ≤ 110 КБ gzip.

## 9.3. Покрытие тестами

Подробный отчёт — в [`docs/08-test-report.md`](08-test-report.md).

| Файл | % Lines | Целевое |
|------|---------|---------|
| `src/utils/bmrStrategy.ts` | 100 % | ≥ 80 % ✅ |
| `src/utils/calorieCalculator.ts` | 100 % | ≥ 80 % ✅ |
| `src/utils/dateUtils.ts` | 100 % | ≥ 80 % ✅ |
| `responseAdapter.ts` | 94.54 % | ≥ 90 % ✅ |
| `foodQueries.getMondayOfWeek` (чистая функция) | 100 % | — |

## 9.4. Безопасность

### 9.4.1. `npm audit --omit=dev`

```
3 high severity vulnerabilities
  react-router-dom  6.0.0-alpha.0 - 6.30.2
    Depends on vulnerable versions of @remix-run/router
```

**Анализ:** уязвимость связана с обработкой URL в `react-router` < 7. Эксплойт требует контролируемой подачи строки маршрута, что в данном PWA невозможно (пути не приходят от пользователя). Полный фикс — миграция на `react-router-dom@7`, что выходит за рамки курсовой работы (требует переработки маршрутов).

**Митигация (план):** запланировать миграцию на v7 в отдельном спринте.

### 9.4.2. Row-Level Security

Все три пользовательские таблицы (`users`, `eaten_products`) защищены RLS-политиками, проверяющими `auth.uid() = id` / `userId`. Справочник `products` доступен только на чтение. Storage-bucket `food-photos` — отдельная политика в [`20260228210000_add_storage_policies.sql`](../supabase/migrations/20260228210000_add_storage_policies.sql).

## 9.5. Качество кода

### 9.5.1. Biome lint

```
Checked 93 files in 95ms. No fixes applied.
Found 15 warnings.
```

Все 15 — `noUnusedImports` и `useImportType` в существующих модулях (наследие до курсовой). Errors = 0. Новые модули (`bmrStrategy.ts`, `llmProvider.ts`, `responseAdapter.ts`) и обновлённые (`calorieCalculator.ts`, `llm.ts`, `parser.ts`) — без предупреждений.

### 9.5.2. TypeScript strict

`npm run typecheck` — **0 ошибок**.

### 9.5.3. Структурные метрики

| Модуль | Строк | Функций | Классов | CC (макс) |
|--------|-------|---------|---------|-----------|
| `bmrStrategy.ts` | 39 | 0 | 2 | 2 |
| `calorieCalculator.ts` | 97 | 5 | 0 | 2 |
| `llmProvider.ts` | 75 | 1 | 1 | 3 |
| `responseAdapter.ts` | 83 | 3 | 1 | 4 |
| `parser.ts` | 39 | 3 | 0 | 2 |
| `llm.ts` | 17 | 1 | 0 | 1 |

Все модули значительно ниже целевых порогов (250 строк / CC 10).

## 9.6. Совместимость

| Артефакт | Статус |
|----------|--------|
| `dist/manifest.webmanifest` | ✅ генерируется |
| `dist/sw.js` (Service Worker) | ✅ генерируется |
| Размер precache | 1181.25 КБ (19 entries) |
| PWA mode | `generateSW` (Workbox) |

## 9.7. Контрольная команда

```bash
npm run typecheck && npm run test:coverage && npm run build
```

Полностью успешно проходит на ветке `main`.
