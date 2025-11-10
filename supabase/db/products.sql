-- Create products table to store nutritional data for search
CREATE TABLE IF NOT EXISTS public.products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow anyone with anon or authenticated role to query products
CREATE POLICY "Allow read access to products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (true);

