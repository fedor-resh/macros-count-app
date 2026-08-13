# Архитектура бэкенда

Go API (`backend/`) обслуживает данные, картинки, анализ фото и авторизацию.
Фронтенд ходит только на `/api/v1` и `/images`.

```
браузер ──► Caddy (TLS, один origin)
              ├── /api/*    ──► Go API ──► Postgres (compose, goose-миграции)
              │                    ├────► OpenRouter (gemini-3-flash, data-URL)
              │                    └────► Google OAuth (опционально)
              ├── /images/* ──► Go API (файлы с volume /data/images)
              └── /*        ──► frontend (vite build + Caddy)

auth: POST /api/v1/auth/login|register|refresh|logout, Google /auth/google/*.
      access JWT 15 мин (Bearer), refresh 30 дней (httpOnly cookie).
realtime: SSE GET /api/v1/events (пуш статуса анализа фото).
бэкапы: сервис backup — ежесуточный pg_dump в ./backups (ретенция 14).
```

## API

Все эндпоинты под `/api/v1`. JWT обязателен, кроме `/auth/*`, `/healthz` и `/images/*`.
Формы JSON совпадают с `src/types/database.types.ts` — файл заморожен как контракт API.

| Метод и путь | Назначение |
|---|---|
| `POST /auth/register` | регистрация `{email, password}` → access + refresh cookie |
| `POST /auth/login` | вход `{email, password}` |
| `POST /auth/refresh` | новый access по refresh cookie (ротация) |
| `POST /auth/logout` | отозвать refresh, сбросить cookie |
| `GET /auth/google/start` | редирект на Google (если задан `GOOGLE_CLIENT_ID`) |
| `GET /auth/google/callback` | обмен code, cookie, редирект на `/auth/callback` |
| `GET /eaten-products?from=&to=` | еда за период |
| `GET /eaten-products?search=&limit=` | история / поиск по своей еде |
| `POST /eaten-products` | добавить (userId всегда из токена) |
| `PATCH /eaten-products/{id}` | изменить (404, если строка чужая) |
| `DELETE /eaten-products/{id}` | удалить (404, если строка чужая) |
| `GET /products?search=&limit=` | поиск по каталогу |
| `GET /me` | профиль (upsert-on-read) |
| `PUT /me/goals` | цели `{caloriesGoal, proteinGoal}` |
| `PATCH /me` | частичное обновление параметров |
| `POST /me/password` | смена пароля `{password}` (только залогиненный) |
| `POST /photos/analyze` | multipart `photo`+`date` → `{id, status:"pending", imageUrl}` |
| `GET /events` | SSE: `event: analysis`, `data: {id, status, name}` |
| `GET /images/{userId}/{file}` | картинки еды (без auth, immutable cache) |

## Схема БД

Источник истины — goose-миграции `backend/migrations/` (embedded в бинарь,
применяются на старте при `AUTO_MIGRATE=true`). Авторизация в Go:
`WHERE "userId"` из токена. Аккаунты живут в `public.users` (`email`,
`password_hash`, `google_sub`); refresh-токены — в `refresh_tokens` (sha256).

## Хранилище картинок

Файлы в `{DATA_DIR}/images/{userId}/photo-{ts}.{ext}`, отдаёт сам Go
на `/images/*` с `Cache-Control: immutable`. LLM получает картинку как
base64 `data:`-URL прямо из байтов загрузки.

## Запуск в разработке

```bash
docker compose up -d postgres

# .env: DATABASE_URL на localhost:55432, AUTO_MIGRATE=true,
# AUTH_JWT_SECRET, PUBLIC_BASE_URL=http://localhost:5173
npm run backend:dev
npm run dev
```

Перенос аккаунтов из старого Supabase Auth (разово):

```bash
./scripts/migrate-auth.sh
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
