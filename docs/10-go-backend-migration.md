# Миграция бэкенда на Go

Go API (`backend/`) заменяет PostgREST, edge function `analyze-food-photo`,
Supabase Postgres и Supabase Storage. **В Supabase остаётся только Auth**
(email/пароль + Google): Go проверяет Supabase JWT (JWKS или legacy HS256).

Статус: Фаза 1 (Go API) — в проде; Фазы 2–3 (свой Postgres + картинки на
диске) — код готов, катовер по runbook ниже.

## Архитектура (Фазы 1–3)

```
браузер ──► Caddy (TLS, один origin)
              ├── /api/*    ──► Go API ──► Postgres (compose, goose-миграции)
              │                    └────► OpenRouter (gemini-3-flash, data-URL)
              ├── /images/* ──► Go API (файлы с volume /data/images)
              └── /*        ──► frontend (vite build + serve)

auth: фронт логинится через supabase.auth, Go верифицирует access token.
realtime: SSE GET /api/v1/events (пуш статуса анализа фото).
бэкапы: сервис backup — ежесуточный pg_dump в ./backups (ретенция 14).
```

## API

Все эндпоинты под `/api/v1`, JWT обязателен (кроме `/healthz` и `/images/*`).
Формы JSON совпадают с `src/types/database.types.ts` — файл заморожен как
контракт API (`npm run gen:types` больше не актуален).

| Метод и путь | Назначение |
|---|---|
| `GET /eaten-products?from=&to=` | еда за период |
| `GET /eaten-products?search=&limit=` | история / поиск по своей еде |
| `POST /eaten-products` | добавить (userId всегда из токена) |
| `PATCH /eaten-products/{id}` | изменить (404, если строка чужая) |
| `DELETE /eaten-products/{id}` | удалить (404, если строка чужая) |
| `GET /products?search=&limit=` | поиск по каталогу |
| `GET /me` | профиль (upsert-on-read — заменяет старый триггер handle_new_user) |
| `PUT /me/goals` | цели `{caloriesGoal, proteinGoal}` |
| `PATCH /me` | частичное обновление параметров |
| `POST /photos/analyze` | multipart `photo`+`date` → `{id, status:"pending", imageUrl}` |
| `GET /events` | SSE: `event: analysis`, `data: {id, status, name}` |
| `GET /images/{userId}/{file}` | картинки еды (без auth, immutable cache) |

## Схема БД

Источник истины — goose-миграции `backend/migrations/` (embedded в бинарь,
применяются на старте при `AUTO_MIGRATE=true`). Отличия от Supabase-схемы:
нет FK на `auth.users`, нет RLS (авторизация в Go: `WHERE "userId"` из
токена), нет триггера `handle_new_user`, добавлены индексы по
`("userId", date)` и `("userId", "createdAt" DESC)`.

**`AUTO_MIGRATE=true` включать только против собственного Postgres** —
дев-бэкенд, смотрящий в Supabase-БД, не должен накатывать туда миграции.

## Хранилище картинок

`STORAGE_DRIVER=disk` (боевой) или `supabase` (переходный, Фаза 1).
Disk: файлы в `{DATA_DIR}/images/{userId}/photo-{ts}.{ext}`, отдаёт сам Go
на `/images/*` с `Cache-Control: immutable`. LLM получает картинку как
base64 `data:`-URL прямо из байтов загрузки — публичная доступность файла
для анализа не нужна.

## Запуск в разработке

```bash
# Локальный Postgres
docker compose up -d postgres

# Единый .env в корне (см. .env.example): для локального Postgres —
# DATABASE_URL=postgresql://postgres:PASSWORD@localhost:55432/postgres,
# AUTO_MIGRATE=true, STORAGE_DRIVER=disk,
# DATA_DIR=./.data, PUBLIC_BASE_URL=http://localhost:8080
npm run backend:dev

# Фронтенд — Vite проксирует /api и /images на :8080
npm run dev
```

## Тесты

```bash
npm run backend:test   # go test ./... — parser, JWT, broker, authz, disk, migrate-images
npm run test:run       # vitest
```

Любой новый эндпоинт обязан получать userID только из контекста
(`httpserver.UserID(ctx)`) и ставить его в `WHERE` — это замена RLS,
закреплённая authz-тестами в `backend/internal/httpserver/router_test.go`.

## Runbook катовера на VPS (Фазы 2–3)

Предусловия: `.env` заполнен по `.env.example` (включая
`POSTGRES_PASSWORD` и `SUPABASE_DB_URL` — session-mode pooler, порт 5432).

1. **Деплой кода**: `git pull && docker compose up -d --build`.
2. **Перенос данных** (даунтайм минуты): `./scripts/migrate-db.sh` —
   поднимет postgres, применит goose-baseline, сделает pg_dump из Supabase
   (изнутри контейнера postgres:17 — правильная версия pg_dump), TRUNCATE +
   restore, сверит row counts, перезапустит api.
3. **Смоук**: чеклист ниже.
4. **Перенос картинок**:
   `docker compose run --rm --entrypoint /migrate-images api` —
   идемпотентно, при сбоях перезапустить (доделает хвост). Старые
   Supabase-URL продолжают работать, пока жив бакет.
5. **После проверки**: удалить бакет `images` в Supabase Dashboard.
   Supabase-проект НЕ удалять и не паузить — там живёт Auth.
6. **Бэкапы**: сервис `backup` пишет в `./backups`; настроить копирование
   вне VPS (rclone/scp по крону хоста) — обязательно.

### Чеклист смоука

1. `GET /healthz` отвечает `ok`; в логах api — `goose: no migrations to run` или применённый baseline.
2. Логин (email/пароль и Google) → `/api/v1/me` отвечает.
3. Неделя грузится, add/edit/delete еды работает; данные совпадают с тем, что было в Supabase.
4. Загрузка фото → `pending` → SSE-нотификация → файл в volume `images_data`, `imageUrl` вида `https://DOMAIN/images/...` открывается.
5. Старые картинки рендерятся (до и после migrate-images).
6. Цели читаются и сохраняются.
7. PWA: offline-шелл работает.

### Откат

- **Фаза 2**: вернуть в compose `DATABASE_URL` на Supabase pooler и
  `AUTO_MIGRATE=""` → данные в Supabase нетронуты (изменения, сделанные
  после катовера, потеряются — перенести руками при необходимости).
- **Фаза 3**: `STORAGE_DRIVER=supabase` + `SUPABASE_SERVICE_ROLE_KEY` —
  пока бакет не удалён.

## После катовера (не забыть)

- Ротировать `SUPABASE_SERVICE_ROLE_KEY` и ключ OpenRouter (лежали в `.env.local`).
- Удалить edge function: `npx supabase functions delete analyze-food-photo`.
- `scripts/export-dataset.ts` не работает (читал Supabase) — пометка в `scripts/README.md`.
- `@supabase/supabase-js` на фронте остаётся — auth ещё на Supabase (до Фазы 4).

## Фаза 4 (опционально): своя auth

Bcrypt email/пароль + Google OAuth + self-issued JWT + refresh-токены;
экспорт `auth.users` (bcrypt-хэши переносимы, uuid сохраняются). Риски:
SMTP для сброса пароля, перерегистрация Google redirect URI, rate limiting.
Supabase Auth free tier может жить неограниченно — решать по необходимости.
