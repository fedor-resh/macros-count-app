#!/usr/bin/env bash
# Перенос данных из Supabase Postgres в свой Postgres (Фаза 2).
# Запускать на VPS из корня репозитория. Требует .env с POSTGRES_PASSWORD
# и SUPABASE_DB_URL (session-mode pooler, порт 5432 — transaction-mode не подходит).
#
#   ./scripts/migrate-db.sh
#
# Скрипт идемпотентен: перед restore таблицы очищаются (TRUNCATE),
# повторный запуск просто переносит данные заново.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required (session-mode pooler URL, см. .env.compose.example)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

DUMP_FILE="backups/supabase-data-$(date +%F-%H%M).sql"
mkdir -p backups

echo "==> 1/5 Поднимаю postgres и api (api применит goose-baseline)..."
docker compose up -d --wait postgres api

echo "==> 2/5 Дамп данных из Supabase (pg_dump из контейнера postgres:17)..."
docker compose exec -T postgres pg_dump "$SUPABASE_DB_URL" \
  --data-only --no-owner --no-privileges \
  --schema=public \
  --table=public.users \
  --table=public.products \
  --table=public.eaten_products \
  > "$DUMP_FILE"
echo "    дамп: $DUMP_FILE ($(wc -c < "$DUMP_FILE") bytes)"

echo "==> 3/5 Очистка локальных таблиц и restore..."
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c 'TRUNCATE public.eaten_products, public.users, public.products RESTART IDENTITY'
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < "$DUMP_FILE" > /dev/null

echo "==> 4/5 Сверка количества строк..."
for table in users products eaten_products; do
  remote=$(docker compose exec -T postgres psql "$SUPABASE_DB_URL" -tA \
    -c "SELECT count(*) FROM public.${table}")
  local_count=$(docker compose exec -T postgres psql -U postgres -d postgres -tA \
    -c "SELECT count(*) FROM public.${table}")
  status="OK"
  [ "$remote" != "$local_count" ] && status="MISMATCH!"
  printf '    %-15s supabase=%-8s local=%-8s %s\n' "$table" "$remote" "$local_count" "$status"
done

echo "==> 5/5 Перезапуск api..."
docker compose restart api

echo
echo "Готово. Дальше:"
echo "  1. Смоук по чеклисту (docs/10-go-backend-migration.md)."
echo "  2. Перенос картинок: docker compose run --rm --entrypoint /migrate-images api"
echo "  3. После проверки — удалить бакет images в Supabase."
