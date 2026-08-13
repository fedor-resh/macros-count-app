#!/usr/bin/env bash
# Перенос аккаунтов из Supabase Auth (auth.users + auth.identities) в public.users.
# UUID сохраняются — eaten_products."userId" остаётся валидным.
# Пароли (bcrypt $2a$...) проверяются тем же golang.org/x/crypto/bcrypt.
#
#   SUPABASE_DB_URL=postgresql://... ./scripts/migrate-auth.sh
#
# Идемпотентно: повторный запуск обновляет email/password_hash/google_sub.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required (session-mode pooler URL)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

DUMP_FILE="backups/auth-users-$(date +%F-%H%M).csv"
mkdir -p backups

echo "==> 1/4 Поднимаю postgres и api (api применит goose-миграции, включая 00002_auth)..."
docker compose up -d --wait postgres api

echo "==> 2/4 Дамп auth.users + google identities из Supabase..."
docker compose exec -T postgres psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\copy (
  SELECT
    u.id,
    lower(u.email),
    NULLIF(u.encrypted_password, ''),
    (
      SELECT i.provider_id
      FROM auth.identities i
      WHERE i.user_id = u.id AND i.provider = 'google'
      LIMIT 1
    )
  FROM auth.users u
  WHERE u.email IS NOT NULL AND u.email <> ''
) TO STDOUT WITH CSV" > "$DUMP_FILE"
echo "    дамп: $DUMP_FILE ($(wc -l < "$DUMP_FILE") строк)"

echo "==> 3/4 Upsert в public.users..."
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c 'DROP TABLE IF EXISTS _auth_import;
      CREATE TABLE _auth_import (
        id uuid,
        email text,
        password_hash text,
        google_sub text
      );'

docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "\copy _auth_import FROM STDIN WITH CSV" < "$DUMP_FILE"

docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "
INSERT INTO public.users (id, email, password_hash, google_sub)
SELECT id, email, password_hash, google_sub FROM _auth_import
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = COALESCE(EXCLUDED.password_hash, public.users.password_hash),
  google_sub = COALESCE(EXCLUDED.google_sub, public.users.google_sub);
SELECT count(*) AS imported FROM _auth_import;
SELECT count(*) AS with_email FROM public.users WHERE email IS NOT NULL;
SELECT count(*) AS with_google FROM public.users WHERE google_sub IS NOT NULL;
DROP TABLE _auth_import;
"

echo "==> 4/4 Перезапуск api..."
docker compose restart api

echo
echo "Готово. Пользователи входят тем же email/паролем или через Google."
echo "Аккаунты только с Google (без password_hash) — вход через кнопку Google."
