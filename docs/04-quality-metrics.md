# 4. Целевые метрики качества (ГОСТ Р ИСО/МЭК 25010)

Документ фиксирует **целевые** значения характеристик качества ПО.
Фактически измеренные значения — в [`docs/09-actual-metrics.md`](09-actual-metrics.md).

## 4.1. Сводная таблица характеристик

| Характеристика | Под-характеристика | Метрика | Целевое значение | Метод измерения |
|----------------|--------------------|---------|------------------|-----------------|
| **Функциональная пригодность** | Функциональная корректность | Доля проходящих unit-тестов | 100 % | `npm run test:run` |
| | Функциональная полнота | Доля реализованных FR из [`02-requirements.md`](02-requirements.md) | ≥ 95 % MUST | ручная сверка |
| | Функциональная уместность | Точность распознавания LLM (top-1 food_name) | ≥ 80 % | `scripts/predict-calories` на размеченном датасете |
| **Производительность** | Временное поведение | First Contentful Paint (FCP) | ≤ 2.5 c | Lighthouse mobile |
| | | Largest Contentful Paint (LCP) | ≤ 2.5 c | Lighthouse mobile |
| | | Total Blocking Time (TBT) | ≤ 200 ms | Lighthouse mobile |
| | | Время ответа Edge Function (pending) | ≤ 1.5 c p95 | Supabase Logs |
| | Использование ресурсов | Размер JS-бандла (gzip) | ≤ 350 КБ | `vite build` + анализ `dist/` |
| | | Объём оперативной памяти (Chrome DevTools, heap) | ≤ 80 МБ | Performance Tab |
| **Совместимость** | Совместное существование | Установка как PWA | Chrome / Safari / Edge | manual |
| | Способность к взаимодействию | Совместимость с Supabase Realtime v2 | 100 % | manual |
| **Удобство использования** | Узнаваемость пригодности | Время до первого успешного добавления продукта | ≤ 30 c | usability-тест (≥ 3 респондента) |
| | Лёгкость изучения | Количество шагов «фото → запись» | ≤ 3 | usability-тест |
| | Доступность | Соответствие WCAG 2.1 AA по Lighthouse Accessibility | ≥ 90 баллов | Lighthouse |
| **Надёжность** | Зрелость | Покрытие unit-тестами критичных модулей (`calorieCalculator`, `parser`, `dateUtils`) | ≥ 80 % lines | `npm run test:coverage` |
| | Отказоустойчивость | Доля корректно обработанных ошибок LLM (статус `error`) | 100 % | unit-тест `parser.test.ts` |
| | Восстанавливаемость | Локальный кэш TanStack Query — переживает обновление страницы | да | manual |
| | Доступность сервиса | SLA Supabase | ≥ 99.9 % | SLA провайдера |
| **Защищённость** | Конфиденциальность | RLS включён для всех таблиц с пользовательскими данными | 100 % | `psql` + миграции |
| | | Уязвимости high/critical в зависимостях | 0 | `npm audit --omit=dev` |
| | Целостность | Триггер `handle_new_user` атомарно создаёт строку в `public.users` | 100 % | миграция |
| | Безотказность (Non-repudiation) | Логирование операций изменения в `eaten_products` | timestamp+userId | `createdAt`, RLS |
| | Учётность (Accountability) | Все RLS-политики используют `auth.uid()` | 100 % | миграция |
| | Аутентичность | Аутентификация через Supabase Auth (JWT) | обязательна | Edge Function `auth.ts` |
| **Сопровождаемость** | Модульность | Длина файла ≤ 250 строк | 100 % файлов | grep + wc |
| | | Цикломатическая сложность функций ≤ 10 | 100 % функций | Biome lint правило `noExcessiveCognitiveComplexity` |
| | Возможность повторного использования | Применены ≥ 3 GoF-паттерна (Factory Method, Adapter, Strategy) | да | code review |
| | Анализируемость | TypeScript strict + 0 ошибок типизации | да | `npm run typecheck` |
| | Изменяемость | Замена LLM-провайдера не требует правок в `index.ts` | да | архитектура (Factory) |
| | Тестируемость | Чистые функции в `utils/` без побочных эффектов | да | code review |
| **Переносимость** | Адаптируемость | Mobile-first дизайн от 320 px | да | manual |
| | Устанавливаемость | PWA manifest + service worker | да | Lighthouse PWA |
| | Заменяемость | Замена БД через миграции Supabase без правок клиентского кода | да | architecture |

## 4.2. Методики измерения

- **Lighthouse** — режим Mobile, throttling «Slow 4G», прогон 3 раза, берётся медианное значение.
- **Bundle size** — `npm run build`, gzipped размер `dist/assets/*.js` (vite печатает в stdout).
- **Coverage** — `npm run test:coverage`, провайдер `v8`, метрика `lines`.
- **Cyclomatic complexity** — правило Biome `lint/complexity/noExcessiveCognitiveComplexity` с порогом `15` (соответствует ≈ CC ≤ 10).
- **Security audit** — `npm audit --omit=dev --audit-level=high`, без записей.

## 4.3. Критерии приёмки

Курсовая работа считается выполненной, если:

1. все MUST-требования из [`02-requirements.md`](02-requirements.md) реализованы;
2. сборка `npm run typecheck && npm run lint && npm run test:coverage && npm run build` проходит без ошибок;
3. coverage критичных модулей ≥ 80 % lines;
4. в коде явно выделены три GoF-паттерна (по одному из каждой категории);
5. документация `docs/01–09` соответствует фактическому состоянию репозитория.
