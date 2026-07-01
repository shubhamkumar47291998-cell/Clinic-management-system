-- Create reception_logs table
create table public.reception_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  visitor_name text not null,
  purpose text check (purpose in ('appointment', 'billing_payment', 'report_collection', 'inquiry')) not null,
  phone text,
  check_in_time timestamp with time zone default timezone('utc'::text, now()) not null,
  check_out_time timestamp with time zone,
  status text check (status in ('waiting', 'served', 'cancelled')) default 'waiting' not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.reception_logs enable row level security;

-- Policies for reception_logs
create policy "Allow clinic staff to manage reception_logs"
  on public.reception_logs for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'staff'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'staff'));

create policy "Allow clinic users to select reception_logs"
  on public.reception_logs for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff', 'nurse'));

-- Trigger function for audit logging
create or replace function public.log_reception_change()
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
    values (current_clinic_id, auth.uid(), 'reception_log_delete', OLD.id, to_jsonb(OLD));
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'reception_log_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    return NEW;
  elsif (TG_OP = 'INSERT') then
    current_clinic_id := NEW.clinic_id;
    insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
    values (current_clinic_id, auth.uid(), 'reception_log_create', NEW.id, to_jsonb(NEW));
    return NEW;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger reception_logs_audit_trigger
  after insert or update or delete on public.reception_logs
  for each row execute procedure public.log_reception_change();
