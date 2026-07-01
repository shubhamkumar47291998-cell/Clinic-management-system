-- Create staff_details table
create table public.staff_details (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  clinic_id uuid references public.clinics not null,
  staff_type text check (staff_type in ('receptionist', 'pharmacist', 'lab_technician', 'billing_clerk')) not null,
  phone text,
  address text,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint staff_profile_unique unique (clinic_id, profile_id)
);

-- Enable RLS
alter table public.staff_details enable row level security;

-- Policies for staff_details
create policy "Allow admins to manage staff_details"
  on public.staff_details for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin')
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin');

create policy "Allow clinic users to select staff_details"
  on public.staff_details for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

-- Trigger function for audit logging
create or replace function public.log_staff_change()
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
    values (current_clinic_id, auth.uid(), 'staff_delete', OLD.id, to_jsonb(OLD));
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'staff_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    return NEW;
  elsif (TG_OP = 'INSERT') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'staff_create', NEW.id, to_jsonb(NEW));
    return NEW;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger staff_details_audit_trigger
  after insert or update or delete on public.staff_details
  for each row execute procedure public.log_staff_change();
