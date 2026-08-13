# Развёртывание

Как поднять приложение локально для разработки и как выкатить его на VPS.

## Из чего состоит приложение

```
браузер ──► Caddy (TLS, один origin)         [на сервере; в деве — Vite]
              ├── /api/*    ──► Go API (backend/) ──► Postgres
              │                    └────► OpenRouter (анализ фото по фото)
              ├── /images/* ──► Go API (файлы на диске)
              └── /*        ──► frontend (React + Vite)

Авторизация: email/пароль и опционально Google OAuth — свои эндпоинты Go
(`/api/v1/auth/*`), access JWT в памяти браузера, refresh в httpOnly cookie.
```

Три независимых куска, которые нужно поднять: **Postgres**, **Go API** (`backend/`) и **фронтенд** (React/Vite). Локально они запускаются как три процесса; на сервере — как контейнеры в одном `docker-compose.yml` (VPS на amd64 и Raspberry Pi 5 на arm64 разворачиваются одинаково).

Подробности о схеме БД и API — в [docs/10-go-backend-migration.md](docs/10-go-backend-migration.md). Этот файл — только про запуск.

## Что нужно установить

- **Node.js 20+** и npm
- **Go 1.25+** ([go.dev/dl](https://go.dev/dl/)) — только для локальной разработки бэкенда; на VPS Go не нужен, бэкенд собирается в Docker
- **Docker + Docker Compose** — для локального Postgres и для полного стека на VPS
- Ключ **OpenRouter** ([openrouter.ai](https://openrouter.ai)) — для анализа фото еды
- (опционально) OAuth-клиент в [Google Cloud Console](https://console.cloud.google.com/) — для входа через Google

---

## Локальная разработка

### Первый запуск

**1. Зависимости**

```bash
npm install
```

**2. Переменные окружения** — один файл `.env` в корне на весь проект (его читают docker compose, Vite, Go-бэкенд и скрипты):

```bash
cp .env.example .env
```

Заполнить:

- `AUTH_JWT_SECRET` — случайная строка (~32+ символов) для подписи access-токенов.
- `OPENROUTER_API_KEY` — для анализа фото.
- `POSTGRES_PASSWORD` — любой (например `local`); подставьте его же в `DATABASE_URL`. `POSTGRES_HOST_PORT` можно не трогать (по умолчанию `55432`, специально не `5432`, чтобы не конфликтовать с другим локальным Postgres на машине).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` и `VITE_GOOGLE_AUTH=true` — только если нужен вход через Google. Redirect URI в Google Cloud Console: `http://localhost:5173/api/v1/auth/google/callback`.
- Остальное (`DOMAIN`, `CADDY_TLS`, `APP_ORIGIN`, `TZ`, `BACKUP_*`) — только для сервера, локально не используется.

**3. Postgres**

```bash
npm run db:up          # docker compose up -d postgres
```

Поднимает контейнер `postgres:17-alpine` на `localhost:55432` с данными в docker-volume — переживает перезапуски.

**4. Бэкенд** (отдельный терминал)

```bash
npm run backend:dev
```

При первом запуске сам применит схему БД (`AUTO_MIGRATE=true` — goose-миграции вшиты в бинарь) и поднимется на `:8080`.

**5. Фронтенд** (ещё один терминал)

```bash
npm run dev
```

Откройте **http://localhost:5173**. Vite проксирует `/api` и `/images` на бэкенд — CORS настраивать не нужно.

**6. Google-логин (если нужен)** — в Google Cloud Console добавьте Redirect URI `http://localhost:5173/api/v1/auth/google/callback` (через Vite-прокси) и выставьте `VITE_GOOGLE_AUTH=true`.

### Повседневная разработка

После первого запуска рутина — это те же шаги 3–5, только без настройки env:

```bash
npm run db:up          # если Postgres был остановлен
npm run backend:dev     # терминал 1
npm run dev             # терминал 2
```

```bash
npm run db:down         # остановить Postgres, когда закончили (данные не теряются)
```

### Проверки перед коммитом

```bash
npm run typecheck && npm run test:run
npm run backend:test
```

### Частые проблемы

| Симптом | Причина |
|---|---|
| Все запросы к `/api/*` → 401 | access-токен истёк и refresh-cookie нет/отозвана — войдите заново; либо `AUTH_JWT_SECRET` сменился после выпуска токенов |
| `npm run db:up` падает: `ports are not available` | Порт `55432` (или что вы указали в `POSTGRES_HOST_PORT`) уже занят другим Postgres на этой машине — смените `POSTGRES_HOST_PORT` в `.env` на свободный и поправьте порт в `DATABASE_URL` |
| Бэкенд не стартует, жалуется на `DATABASE_URL` | Postgres не поднят (`npm run db:up`) или пароль/порт в `DATABASE_URL` не совпадает с `POSTGRES_PASSWORD`/`POSTGRES_HOST_PORT` |
| Фронт не может достучаться до `/api` | `npm run backend:dev` не запущен, или порт `8080` занят |
| Фото зависает в статусе "анализируем" | Смотрите консоль `backend:dev` — там залогируется ошибка от OpenRouter (неверный `OPENROUTER_API_KEY`, недоступна модель и т.п.) |
| Google-логин редиректит не туда | в Google Cloud Console не добавлен текущий Redirect URI (`http://localhost:5173/api/v1/auth/google/callback` в деве, `https://<DOMAIN>/api/v1/auth/google/callback` на сервере) |

---

## Сервер: VPS или Raspberry Pi 5

Весь стек описан в одном `docker-compose.yml` — пять сервисов, которые поднимаются одной командой:

| Сервис | Что делает |
|---|---|
| `caddy` | TLS и единый origin: `/api/*` и `/images/*` → `api`, всё остальное → `frontend` |
| `postgres` | БД, данные в volume `pg_data`, настройки под 4–8 GB RAM |
| `api` | Go-бэкенд, картинки в volume `images_data`, миграции применяет сам |
| `frontend` | собранная статика, раздаёт Caddy (не Node — экономия ~70 МБ RSS) |
| `backup` | `pg_dump` в `./backups` по расписанию |

Образы собираются на самой машине, поэтому amd64-VPS и arm64-Pi разворачиваются одинаково, без кросс-компиляции и без реестра.

### Требования к Raspberry Pi 5

- **64-битная ОС.** `uname -m` должен вернуть `aarch64`: у Postgres 17 нет официальных 32-битных образов. На 32-битной системе контейнеры упадут с `exec format error`.
- **Загрузка с NVMe или SSD, не с microSD.** Postgres и сборка фронтенда — это интенсивная запись; SD-карта деградирует за месяцы.
- 4 GB RAM достаточно для работы, но сборке фронтенда нужен swap (см. «Частые проблемы»). На 8 GB нюансов нет.
- Docker с compose-плагином и автозапуск, иначе после отключения питания стек не поднимется:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER      # перелогиниться после этого
sudo systemctl enable docker
```

### 1. Код и `.env`

```bash
git clone <repo> && cd bite
cp .env.example .env
```

| Переменная | Чем заполнить |
|---|---|
| `DOMAIN` | адрес, по которому открывают приложение: домен или IP машины в сети |
| `CADDY_TLS` | `internal` или email для Let's Encrypt — см. следующий пункт |
| `APP_ORIGIN` | пусто, если приложение доступно по `https://$DOMAIN`; иначе полный origin (например `http://192.168.1.50`) |
| `POSTGRES_PASSWORD` | любой надёжный пароль, придумывается один раз |
| `AUTH_JWT_SECRET` | случайная строка для подписи access-JWT |
| `OPENROUTER_API_KEY` | ключ [openrouter.ai](https://openrouter.ai) |
| `TZ` | часовой пояс, например `Europe/Moscow` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth-клиент в Google Cloud Console; Redirect URI: `https://$DOMAIN/api/v1/auth/google/callback` |
| `VITE_GOOGLE_AUTH` | `true`, если нужна кнопка Google (вшивается при сборке фронта) |

`APP_ORIGIN` попадает в БД: URL каждой картинки сохраняется абсолютным. Менять его после начала эксплуатации — значит сломать ссылки на уже загруженные фото (как починить — в «Частых проблемах»). Поэтому адрес стоит выбрать сразу.

### 2. Как запросы будут доходить до машины

Фотографирование еды работает только в secure context, то есть по HTTPS с сертификатом, которому доверяет браузер телефона. От этого зависит выбор варианта — особенно дома, где 80-й порт часто закрыт провайдером:

| Вариант | `DOMAIN` | `CADDY_TLS` | Что нужно снаружи |
|---|---|---|---|
| Публичный домен | `bite.example.com` | `you@example.com` | A-запись на IP машины + проброс портов 80 и 443 |
| Cloudflare Tunnel (обычно проще всего для Pi) | `bite.example.com` | `internal` | `cloudflared` на хосте, проброс портов не нужен |
| Tailscale | `pi.tailnet.ts.net` | `internal` | `tailscale serve --bg https+insecure://localhost:443` |
| Только LAN, чтобы попробовать | `192.168.1.50` | `internal` | ничего, но браузер будет предупреждать о сертификате |

С Let's Encrypt (`CADDY_TLS=you@example.com`) Caddy получает сертификат сам при первом старте; DNS должен быть настроен заранее, иначе выдача не пройдёт.

Для Cloudflare Tunnel `cloudflared` должен ходить на Caddy по HTTPS, иначе получится цикл редиректов:

```yaml
ingress:
  - hostname: bite.example.com
    service: https://localhost:443
    originRequest:
      noTLSVerify: true      # сертификат от локального CA Caddy
  - service: http_status:404
```

В LAN-варианте сертификат самоподписанный: чтобы заработали камера и PWA, корневой сертификат Caddy надо установить на устройства.

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

### 3. Запуск

```bash
docker compose up -d --build
```

Первая сборка на Pi 5 занимает примерно 5–10 минут; дольше всего собирается фронтенд. Дальнейшие пересборки быстрее: кэши npm и Go-компилятора сохраняются между запусками. Порядок старта задан healthcheck'ами — `api` ждёт готовности Postgres, `caddy` ждёт `api` и `frontend`, так что первое `docker compose ps` может застать часть контейнеров в `starting`.

### 4. Проверка

```bash
docker compose ps                       # все сервисы healthy
curl -k https://<DOMAIN>/healthz        # -> ok
```

Затем откройте сайт в браузере и войдите. Для Google-логина добавьте Redirect URI `https://<DOMAIN>/api/v1/auth/google/callback` в Google Cloud Console.

### 5. Перенос данных и аккаунтов из Supabase

Только если в старом Supabase-проекте уже есть пользователи и записи. Выполняется один раз:

```bash
./scripts/migrate-db.sh
./scripts/migrate-auth.sh
docker compose run --rm migrate-images
```

### 6. Бэкапы

Сервис `backup` уже настроен: `pg_dump` в `./backups` каждые `BACKUP_INTERVAL` секунд с ретенцией `BACKUP_KEEP` файлов. Руками остаётся одно — настроить копирование `./backups` за пределы машины (rclone/scp по крону хоста). Бэкап на том же диске не спасает от смерти этого диска, что для Pi актуальнее, чем для VPS.

### Обновление после изменений в коде

```bash
git pull && docker compose up -d --build
```

Postgres и его данные не трогаются; пересобираются и перезапускаются только `api` и `frontend`. Значения `VITE_*` вшиваются в бандл при сборке, поэтому после их изменения нужен именно `--build`, а не `restart`.

### Обслуживание

```bash
docker compose ps
docker compose logs -f api        # или frontend / caddy / postgres
docker compose restart api
```

Ручной бэкап вне расписания:

```bash
docker compose exec postgres pg_dump -U postgres postgres | gzip > backups/manual-$(date +%F).sql.gz
```

### Частые проблемы на сервере

| Симптом | Причина и что делать |
|---|---|
| Сборка фронтенда падает с `Killed` или `SIGKILL` | не хватило памяти (обычно Pi с 4 GB). Добавить swap: `sudo dphys-swapfile swapoff && sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile && sudo dphys-swapfile setup && sudo dphys-swapfile swapon` |
| Контейнеры падают с `exec format error` | 32-битная ОС на Pi — нужна 64-битная (`uname -m` → `aarch64`) |
| Caddy в логах не может получить сертификат | DNS не указывает на машину или снаружи закрыт порт 80. Перейти на `CADDY_TLS=internal` + Cloudflare Tunnel |
| Камера не открывается на телефоне | сертификат браузеру не доверяется. Нужен валидный сертификат (домен/туннель) либо установленный корневой сертификат Caddy |
| Старые фото отдают 404 после смены адреса | в БД лежат абсолютные URL с прежним origin. Зайти в `docker compose exec postgres psql -U postgres` и выполнить `UPDATE eaten_products SET "imageUrl" = replace("imageUrl", 'https://старый', 'https://новый');` |
| `docker compose up` жалуется на required variable | в `.env` не заполнены `POSTGRES_PASSWORD` / `AUTH_JWT_SECRET` |
| Все `/api/*` → 401 | access-токен истёк; либо сменился `AUTH_JWT_SECRET` — войдите заново |

### Откат

Восстановить БД из `./backups` (`pg_restore` / `psql` из `.sql.gz`) и откатить код на предыдущий git-тег. Картинки живут в volume `images_data`.

Подробнее про API и схему — в [docs/10-go-backend-migration.md](docs/10-go-backend-migration.md).
