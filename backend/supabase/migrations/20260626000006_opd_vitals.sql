-- Alter appointments status check to allow checked_in and in_consultation
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check check (
  status in ('confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')
);

-- Create OPD Vitals table
create table public.opd_vitals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  appointment_id uuid references public.appointments not null unique,
  temperature_f numeric(4, 1) check (temperature_f >= 80.0 and temperature_f <= 120.0),
  pulse_bpm integer check (pulse_bpm >= 20 and pulse_bpm <= 250),
  systolic_bp integer check (systolic_bp >= 40 and systolic_bp <= 300),
  diastolic_bp integer check (diastolic_bp >= 20 and diastolic_bp <= 200),
  weight_kg numeric(5, 2) check (weight_kg > 0.0 and weight_kg < 500.0),
  spo2_percent integer check (spo2_percent >= 50 and spo2_percent <= 100),
  respiratory_rate_bpm integer check (respiratory_rate_bpm >= 5 and respiratory_rate_bpm <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.opd_vitals enable row level security;

-- Policies
create policy "Allow staff, doctor, admin to manage opd_vitals"
  on public.opd_vitals for all
  using (clinic_id = public.get_my_clinic_id())
  with check (clinic_id = public.get_my_clinic_id());

create policy "Allow patient to view own vitals"
  on public.opd_vitals for select
  using (
    appointment_id in (
      select id from public.appointments 
      where patient_id in (
        select id from public.patients where phone = auth.jwt()->>'phone'
      )
    )
  );
