CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Create policy for public inserts
DROP POLICY IF EXISTS "Allow public inserts on inquiries" ON public.inquiries;
CREATE POLICY "Allow public inserts on inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (true);

-- Create policy for clinic read
DROP POLICY IF EXISTS "Allow clinic read on inquiries" ON public.inquiries;
CREATE POLICY "Allow clinic read on inquiries" ON public.inquiries
  FOR SELECT TO authenticated USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
