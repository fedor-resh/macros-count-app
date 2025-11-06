-- Create products table
CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  "imageUrl" text,
  protein numeric NOT NULL DEFAULT 0,
  kcalories numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'g',
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_protein_non_negative CHECK (protein >= 0),
  CONSTRAINT products_kcalories_non_negative CHECK (kcalories >= 0)
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products table (all users can view, but only authenticated users can insert/update)
CREATE POLICY "Anyone can view products"
  ON public.products
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
  ON public.products
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create function to automatically update updatedAt timestamp for products
CREATE OR REPLACE FUNCTION public.handle_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products updated_at
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_products_updated_at();

