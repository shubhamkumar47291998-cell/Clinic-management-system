-- Create beds table
create table public.beds (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  room_no text not null,
  bed_no text not null,
  ward_type text check (ward_type in ('general', 'semi_private', 'private', 'icu')) not null,
  rate_per_day numeric(10, 2) not null check (rate_per_day >= 0),
  status text check (status in ('available', 'occupied', 'maintenance')) default 'available' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint bed_unique unique (clinic_id, room_no, bed_no)
);

-- Create IPD admissions table
create table public.ipd_admissions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  patient_id uuid references public.patients not null,
  bed_id uuid references public.beds not null,
  doctor_id uuid references public.profiles not null,
  admission_date timestamp with time zone default timezone('utc'::text, now()) not null,
  discharge_date timestamp with time zone,
  provisional_diagnosis text not null,
  treatment_logs jsonb default '[]'::jsonb not null,
  status text check (status in ('admitted', 'discharged')) default 'admitted' not null,
  discharge_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.beds enable row level security;
alter table public.ipd_admissions enable row level security;

-- Policies for Beds
create policy "Allow staff, doctor, admin to manage beds"
  on public.beds for all
  using (clinic_id = public.get_my_clinic_id())
  with check (clinic_id = public.get_my_clinic_id());

create policy "Allow patient to view beds"
  on public.beds for select
  using (clinic_id = public.get_my_clinic_id());

-- Policies for IPD Admissions
create policy "Allow staff, doctor, admin to manage ipd_admissions"
  on public.ipd_admissions for all
  using (clinic_id = public.get_my_clinic_id())
  with check (clinic_id = public.get_my_clinic_id());

create policy "Allow patient to view own admissions"
  on public.ipd_admissions for select
  using (
    patient_id in (
      select id from public.patients where phone = auth.jwt()->>'phone'
    )
  );

-- Trigger/Function to automatically mark a bed as occupied on admission
create or replace function public.update_bed_status_on_admission()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.beds 
    set status = 'occupied' 
    where id = new.bed_id;
  elsif (TG_OP = 'UPDATE') then
    -- If status changes to discharged, free the bed
    if (new.status = 'discharged' and old.status = 'admitted') then
      update public.beds 
      set status = 'available' 
      where id = new.bed_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_ipd_admission_created_or_updated
  after insert or update on public.ipd_admissions
  for each row execute procedure public.update_bed_status_on_admission();
