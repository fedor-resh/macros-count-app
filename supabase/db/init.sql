-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.eaten_product (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  protein bigint,
  kcalories bigint,
  unit text,
  value double precision,
  date date DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  name text DEFAULT 'Продукт',
  CONSTRAINT eaten_product_pkey PRIMARY KEY (id),
  CONSTRAINT eaten_product_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
