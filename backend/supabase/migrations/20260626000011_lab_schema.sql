-- Create lab_tests table
create table public.lab_tests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  name text not null,
  code text not null,
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint lab_test_code_unique unique (clinic_id, code)
);

-- Create lab_requests table
create table public.lab_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  patient_id uuid references public.patients not null,
  doctor_id uuid references public.profiles,
  test_id uuid references public.lab_tests not null,
  status text check (status in ('pending', 'sample_collected', 'completed', 'cancelled')) default 'pending' not null,
  result_notes text,
  attachment_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.lab_tests enable row level security;
alter table public.lab_requests enable row level security;

-- Policies for lab_tests
create policy "Allow clinical users to manage lab tests"
  on public.lab_tests for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow patients to select own clinic lab tests catalog"
  on public.lab_tests for select
  using (clinic_id = public.get_my_clinic_id());

-- Policies for lab_requests
create policy "Allow clinical users to manage lab requests"
  on public.lab_requests for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow patients to select own lab requests"
  on public.lab_requests for select
  using (clinic_id = public.get_my_clinic_id() and patient_id in (select id from public.patients where phone = auth.jwt()->>'phone'));

-- Trigger function for audit logging
create or replace function public.log_lab_change()
returns trigger
language plpgsql
security definer
as $$
declare
  current_clinic_id uuid;
begin
  if (TG_TABLE_NAME = 'lab_tests') then
    if (TG_OP = 'DELETE') then
      current_clinic_id := OLD.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'lab_test_delete', OLD.id, to_jsonb(OLD));
      return OLD;
    elsif (TG_OP = 'UPDATE') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'lab_test_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
      return NEW;
    elsif (TG_OP = 'INSERT') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'lab_test_create', NEW.id, to_jsonb(NEW));
      return NEW;
    end if;
  elsif (TG_TABLE_NAME = 'lab_requests') then
    if (TG_OP = 'DELETE') then
      current_clinic_id := OLD.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'lab_request_delete', OLD.id, to_jsonb(OLD));
      return OLD;
    elsif (TG_OP = 'UPDATE') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'lab_request_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
      return NEW;
    elsif (TG_OP = 'INSERT') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'lab_request_create', NEW.id, to_jsonb(NEW));
      return NEW;
    end if;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger lab_test_audit_trigger
  after insert or update or delete on public.lab_tests
  for each row execute procedure public.log_lab_change();

create trigger lab_request_audit_trigger
  after insert or update or delete on public.lab_requests
  for each row execute procedure public.log_lab_change();
