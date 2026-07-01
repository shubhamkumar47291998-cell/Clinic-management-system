CREATE SEQUENCE IF NOT EXISTS public.patient_id_seq START WITH 1;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_readable_id text UNIQUE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS blood_group text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_history text;

-- Create or replace trigger function to auto-assign patient_readable_id
CREATE OR REPLACE FUNCTION public.assign_patient_readable_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_readable_id IS NULL THEN
    NEW.patient_readable_id := 'PAT-' || lpad(nextval('public.patient_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_patient_readable_id ON public.patients;
CREATE TRIGGER trigger_assign_patient_readable_id
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.assign_patient_readable_id();
