-- Update role check constraint in profiles to support nurse
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('super_admin', 'admin', 'doctor', 'staff', 'patient', 'nurse'));

-- Create nurse_assignments table
create table public.nurse_assignments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  nurse_id uuid references public.profiles(id) on delete cascade not null,
  assigned_ward text not null,
  shift text check (shift in ('morning', 'evening', 'night')) not null,
  start_date date not null,
  end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.nurse_assignments enable row level security;

-- Policies for nurse_assignments
create policy "Allow admins to manage nurse_assignments"
  on public.nurse_assignments for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin')
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin');

create policy "Allow clinic users to select nurse_assignments"
  on public.nurse_assignments for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff', 'nurse'));

-- Trigger function for audit logging
create or replace function public.log_nurse_assignment_change()
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
    values (current_clinic_id, auth.uid(), 'nurse_assignment_delete', OLD.id, to_jsonb(OLD));
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'nurse_assignment_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    return NEW;
  elsif (TG_OP = 'INSERT') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'nurse_assignment_create', NEW.id, to_jsonb(NEW));
    return NEW;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger nurse_assignments_audit_trigger
  after insert or update or delete on public.nurse_assignments
  for each row execute procedure public.log_nurse_assignment_change();
