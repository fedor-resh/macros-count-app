-- +goose Up
-- Своя авторизация вместо Supabase Auth.
-- email/password_hash/google_sub живут в public.users (тот же UUID, что и раньше).
-- Refresh-токены хранятся только как sha256-хэш; сырое значение — в httpOnly cookie.

ALTER TABLE public.users
  ADD COLUMN email text UNIQUE,
  ADD COLUMN password_hash text,
  ADD COLUMN google_sub text UNIQUE;

CREATE TABLE public.refresh_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_idx ON public.refresh_tokens (user_id);

-- +goose Down
DROP TABLE public.refresh_tokens;
ALTER TABLE public.users
  DROP COLUMN IF EXISTS google_sub,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS email;
