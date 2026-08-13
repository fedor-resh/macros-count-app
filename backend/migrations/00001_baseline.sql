-- +goose Up
-- Baseline для собственного Postgres (Фаза 2).
-- Производная от supabase/migrations/20250101000000_initial_schema.sql
-- + 20260227120000_add_status_to_eaten_products.sql, с отличиями:
--   * нет FK на auth.users и триггера handle_new_user (профиль создаётся
--     upsert-on-read в Go: repo.Users.GetOrCreate);
--   * нет RLS-политик — авторизация обеспечивается Go-слоем (WHERE "userId");
--   * у eaten_products."userId" убран дефолт gen_random_uuid() (латентный баг);
--   * добавлены индексы под range- и history-запросы.

CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "caloriesGoal" integer NOT NULL DEFAULT 3000,
  "proteinGoal" integer NOT NULL DEFAULT 150,
  weight numeric,
  height numeric,
  age integer,
  gender text CHECK (gender IN ('male', 'female')),
  "activityLevel" text CHECK ("activityLevel" IN ('sedentary', 'light', 'moderate', 'high', 'veryHigh')),
  goal text CHECK (goal IN ('loss', 'maintain', 'gain')),
  CONSTRAINT users_calories_goal_positive CHECK ("caloriesGoal" > 0),
  CONSTRAINT users_protein_goal_positive CHECK ("proteinGoal" > 0),
  CONSTRAINT users_weight_positive CHECK (weight IS NULL OR weight > 0),
  CONSTRAINT users_height_positive CHECK (height IS NULL OR height > 0),
  CONSTRAINT users_age_positive CHECK (age IS NULL OR age > 0)
);

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  name text NOT NULL,
  brand text,
  unit text NOT NULL DEFAULT 'г',
  serving_value numeric NOT NULL DEFAULT 100,
  kcalories numeric,
  protein numeric,
  fat numeric,
  carbs numeric,
  CONSTRAINT products_name_unique UNIQUE (name)
);

CREATE TABLE public.eaten_products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  protein bigint,
  kcalories bigint,
  unit text,
  value double precision,
  date date DEFAULT CURRENT_DATE,
  "userId" uuid,
  name text NOT NULL DEFAULT 'Продукт'::text,
  "imageUrl" text,
  status text NOT NULL DEFAULT 'completed',
  CONSTRAINT eaten_products_pkey PRIMARY KEY (id)
);

CREATE INDEX eaten_products_user_date_idx
  ON public.eaten_products ("userId", date);

CREATE INDEX eaten_products_user_created_idx
  ON public.eaten_products ("userId", "createdAt" DESC);

-- +goose Down
DROP TABLE public.eaten_products;
DROP TABLE public.products;
DROP TRIGGER set_updated_at ON public.users;
DROP TABLE public.users;
DROP FUNCTION public.handle_updated_at();
