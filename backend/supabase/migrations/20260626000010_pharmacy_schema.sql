-- Create pharmacy_medicines table
create table public.pharmacy_medicines (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  name text not null,
  generic_name text,
  sku text,
  batch_no text,
  expiry_date date not null,
  stock_qty integer not null default 0 check (stock_qty >= 0),
  price_per_unit numeric(10, 2) not null check (price_per_unit >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create pharmacy_dispensations table
create table public.pharmacy_dispensations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  patient_id uuid references public.patients not null,
  doctor_id uuid references public.profiles,
  items jsonb not null, -- Array of { medicine_id: UUID, name: text, qty: int, price_per_unit: numeric }
  total_price numeric(10, 2) not null check (total_price >= 0),
  status text check (status in ('pending', 'dispensed', 'cancelled')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.pharmacy_medicines enable row level security;
alter table public.pharmacy_dispensations enable row level security;

-- Policies for pharmacy_medicines
create policy "Allow clinical users to manage pharmacy medicines"
  on public.pharmacy_medicines for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow clinical users to manage pharmacy dispensations"
  on public.pharmacy_dispensations for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

-- Trigger function for audit logging
create or replace function public.log_pharmacy_change()
returns trigger
language plpgsql
security definer
as $$
declare
  current_clinic_id uuid;
begin
  if (TG_TABLE_NAME = 'pharmacy_medicines') then
    if (TG_OP = 'DELETE') then
      current_clinic_id := OLD.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'medicine_delete', OLD.id, to_jsonb(OLD));
      return OLD;
    elsif (TG_OP = 'UPDATE') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'medicine_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
      return NEW;
    elsif (TG_OP = 'INSERT') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'medicine_create', NEW.id, to_jsonb(NEW));
      return NEW;
    end if;
  elsif (TG_TABLE_NAME = 'pharmacy_dispensations') then
    if (TG_OP = 'DELETE') then
      current_clinic_id := OLD.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'dispensation_delete', OLD.id, to_jsonb(OLD));
      return OLD;
    elsif (TG_OP = 'UPDATE') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'dispensation_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
      return NEW;
    elsif (TG_OP = 'INSERT') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'dispensation_create', NEW.id, to_jsonb(NEW));
      return NEW;
    end if;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger medicine_audit_trigger
  after insert or update or delete on public.pharmacy_medicines
  for each row execute procedure public.log_pharmacy_change();

create trigger dispensation_audit_trigger
  after insert or update or delete on public.pharmacy_dispensations
  for each row execute procedure public.log_pharmacy_change();
