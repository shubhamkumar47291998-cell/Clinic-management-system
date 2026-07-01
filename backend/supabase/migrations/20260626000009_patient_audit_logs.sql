-- Create audit_logs table
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  actor_id uuid references public.profiles,
  action text not null,
  target_id uuid not null,
  details jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.audit_logs enable row level security;

-- Policy for selecting audit logs (Admins and Staff only)
create policy "Allow admins and staff to select audit logs"
  on public.audit_logs for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'staff'));

-- Trigger function to log patient audit records
create or replace function public.log_patient_change()
returns trigger
language plpgsql
security definer
as $$
declare
  current_clinic_id uuid;
begin
  if (TG_OP = 'DELETE') then
    current_clinic_id := OLD.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (
      current_clinic_id,
      auth.uid(),
      'patient_delete',
      OLD.id,
      to_jsonb(OLD)
    );
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (
      current_clinic_id,
      auth.uid(),
      'patient_update',
      NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    return NEW;
  elsif (TG_OP = 'INSERT') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (
      current_clinic_id,
      auth.uid(),
      'patient_create',
      NEW.id,
      to_jsonb(NEW)
    );
    return NEW;
  end if;
  return null;
end;
$$;

-- Create triggers on patients table
create trigger patient_audit_trigger
  after insert or update or delete on public.patients
  for each row execute procedure public.log_patient_change();

-- Restrict patients delete to admin role only
drop policy if exists "Allow staff, doctor, admin to delete patients" on public.patients;
create policy "Allow admin to delete patients"
  on public.patients for delete
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin');
