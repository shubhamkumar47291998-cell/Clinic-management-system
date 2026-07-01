ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS doctor_signature text;
