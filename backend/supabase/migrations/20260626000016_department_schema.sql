-- Create departments table
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  name text not null,
  code text not null,
  description text,
  head_doctor_id uuid references public.profiles(id) on delete set null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint clinic_dept_code_unique unique (clinic_id, code)
);

-- Alter profiles and patients to reference departments
alter table public.profiles add column department_id uuid references public.departments(id) on delete set null;
alter table public.patients add column department_id uuid references public.departments(id) on delete set null;

-- Enable RLS
alter table public.departments enable row level security;

-- Policies for departments
create policy "Allow admins to manage departments"
  on public.departments for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin')
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin');

create policy "Allow clinic users to select departments"
  on public.departments for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff', 'nurse', 'patient'));

-- Trigger function for audit logging
create or replace function public.log_department_change()
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
    values (current_clinic_id, auth.uid(), 'department_delete', OLD.id, to_jsonb(OLD));
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'department_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    return NEW;
  elsif (TG_OP = 'INSERT') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'department_create', NEW.id, to_jsonb(NEW));
    return NEW;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger departments_audit_trigger
  after insert or update or delete on public.departments
  for each row execute procedure public.log_department_change();
