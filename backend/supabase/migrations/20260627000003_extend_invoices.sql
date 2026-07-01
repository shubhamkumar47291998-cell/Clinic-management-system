CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS gst_rate numeric(5,2) DEFAULT 0.0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS gst_amount numeric(10,2) DEFAULT 0.0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.profiles;

-- Create or replace trigger function to auto-assign invoice_number
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_invoice_number ON public.invoices;
CREATE TRIGGER trigger_assign_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.assign_invoice_number();
