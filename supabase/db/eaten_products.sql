-- Create eaten_products table
CREATE TABLE public.eaten_products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  protein bigint,
  kcalories bigint,
  unit text,
  value double precision,
  date date DEFAULT now(),
  "userId" uuid DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Продукт'::text,
  "imageUrl" text,
  CONSTRAINT eaten_products_pkey PRIMARY KEY (id),
  CONSTRAINT eaten_products_user_id_fkey FOREIGN KEY ("userId") REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.eaten_products ENABLE ROW LEVEL SECURITY;

-- Create policies for eaten_products table
CREATE POLICY "Enable users to view their own data only"
  ON public.eaten_products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "userId");

CREATE POLICY "Enable insert for users based on user_id"
  ON public.eaten_products
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "update"
  ON public.eaten_products
  FOR UPDATE
  USING (auth.uid() = "userId");

CREATE POLICY "Enable delete for users based on user_id"
  ON public.eaten_products
  FOR DELETE
  USING (auth.uid() = "userId");

