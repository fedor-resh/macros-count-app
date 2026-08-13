-- +goose Up
-- Имя и аватар из Google-профиля. Раньше их держал Supabase в user_metadata,
-- теперь это обычные колонки: Google-вход обновляет их при каждом входе,
-- потому что ссылка на картинку у Google со временем меняется.

ALTER TABLE public.users
  ADD COLUMN name text,
  ADD COLUMN avatar_url text;

-- +goose Down
ALTER TABLE public.users
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS name;
