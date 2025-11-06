-- Create eaten_product table
CREATE TABLE public.eaten_product (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "productId" bigint NOT NULL,
  value double precision NOT NULL,
  date date DEFAULT now(),
  "userId" uuid NOT NULL,
  CONSTRAINT eaten_product_pkey PRIMARY KEY (id),
  CONSTRAINT eaten_product_user_id_fkey FOREIGN KEY ("userId") REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT eaten_product_product_id_fkey FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.eaten_product ENABLE ROW LEVEL SECURITY;

-- Create policies for eaten_product table
CREATE POLICY "Users can view own eaten products"
  ON public.eaten_product
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own eaten products"
  ON public.eaten_product
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own eaten products"
  ON public.eaten_product
  FOR UPDATE
  USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own eaten products"
  ON public.eaten_product
  FOR DELETE
  USING (auth.uid() = "userId");

