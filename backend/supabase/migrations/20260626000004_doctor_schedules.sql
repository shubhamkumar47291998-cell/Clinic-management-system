-- Create doctor schedules table
create table public.doctor_schedules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  doctor_id uuid references public.profiles not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time without time zone not null,
  end_time time without time zone not null,
  slot_duration_minutes integer default 15 not null check (slot_duration_minutes > 0),
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent overlapping schedule records for the same doctor on the same day
  constraint doctor_day_unique unique (doctor_id, day_of_week),
  -- Ensure start time is before end time
  constraint start_time_before_end_time check (start_time < end_time)
);

-- Enable RLS
alter table public.doctor_schedules enable row level security;

-- Policies

-- 1. Anyone in the clinic or anonymous patients can view doctor availability
create policy "Allow select access to doctor_schedules"
  on public.doctor_schedules for select
  using (clinic_id = public.get_my_clinic_id() or auth.role() = 'anon');

-- 2. Admins can insert/manage all schedules, and doctors can manage their own schedules
create policy "Allow insert access to doctor_schedules"
  on public.doctor_schedules for insert
  with check (
    clinic_id = public.get_my_clinic_id() 
    and (
      public.get_my_role() = 'admin' 
      or (public.get_my_role() = 'doctor' and doctor_id = auth.uid())
    )
  );

create policy "Allow update access to doctor_schedules"
  on public.doctor_schedules for update
  using (
    clinic_id = public.get_my_clinic_id() 
    and (
      public.get_my_role() = 'admin' 
      or (public.get_my_role() = 'doctor' and doctor_id = auth.uid())
    )
  );

create policy "Allow delete access to doctor_schedules"
  on public.doctor_schedules for delete
  using (
    clinic_id = public.get_my_clinic_id() 
    and (
      public.get_my_role() = 'admin' 
      or (public.get_my_role() = 'doctor' and doctor_id = auth.uid())
    )
  );
