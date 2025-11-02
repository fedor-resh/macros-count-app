-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- Create users table with goals
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  calories_goal integer NOT NULL DEFAULT 3000,
  protein_goal integer NOT NULL DEFAULT 150,
  weight numeric,
  height numeric,
  age integer,
  gender text CHECK (gender IN ('male', 'female')),
  activity_level text CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'high', 'veryHigh')),
  goal text CHECK (goal IN ('loss', 'maintain', 'gain')),
  CONSTRAINT users_calories_goal_positive CHECK (calories_goal > 0),
  CONSTRAINT users_protein_goal_positive CHECK (protein_goal > 0),
  CONSTRAINT users_weight_positive CHECK (weight IS NULL OR weight > 0),
  CONSTRAINT users_height_positive CHECK (height IS NULL OR height > 0),
  CONSTRAINT users_age_positive CHECK (age IS NULL OR age > 0)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, calories_goal, protein_goal, gender, activity_level, goal)
  VALUES (NEW.id, 3000, 150, 'male', 'moderate', 'maintain')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create user on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create eaten_product table
CREATE TABLE public.eaten_product (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  protein bigint,
  kcalories bigint,
  unit text,
  value double precision,
  date date DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Продукт'::text,
  image_url text,
  CONSTRAINT eaten_product_pkey PRIMARY KEY (id),
  CONSTRAINT eaten_product_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
