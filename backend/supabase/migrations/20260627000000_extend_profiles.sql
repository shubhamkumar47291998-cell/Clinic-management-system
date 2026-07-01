ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qualifications text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code text;
