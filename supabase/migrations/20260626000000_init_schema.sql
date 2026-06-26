-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist";

-- Create tables
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  subscription_plan text default 'basic' not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  clinic_id uuid references public.clinics,
  name text not null,
  role text check (role in ('admin', 'doctor', 'staff', 'patient')) not null,
  specialization text,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  name text not null,
  phone text,
  dob date,
  gender text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  patient_id uuid references public.patients not null,
  doctor_id uuid references public.profiles not null,
  slot_start timestamp with time zone not null,
  slot_end timestamp with time zone not null,
  status text check (status in ('confirmed', 'completed', 'cancelled', 'no_show')) default 'confirmed' not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Prevent double booking of a doctor at the same slot
  constraint doctor_slot_clash exclude using gist (
    doctor_id with =,
    tstzrange(slot_start, slot_end) with &&
  )
);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  patient_id uuid references public.patients not null,
  doctor_id uuid references public.profiles not null,
  appointment_id uuid references public.appointments,
  visit_date date default current_date not null,
  diagnosis text,
  prescriptions jsonb default '[]'::jsonb not null,
  attachments jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  patient_id uuid references public.patients not null,
  appointment_id uuid references public.appointments,
  items jsonb default '[]'::jsonb not null,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  payment_status text check (payment_status in ('unpaid', 'paid', 'partially_paid')) default 'unpaid' not null,
  payment_method text,
  issued_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  patient_id uuid references public.patients not null,
  appointment_id uuid references public.appointments not null,
  request_sent_at timestamp with time zone,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  source text check (source in ('google', 'in_app')) default 'in_app' not null,
  status text check (status in ('requested', 'completed')) default 'requested' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  referring_patient_id uuid references public.patients not null,
  code text not null,
  referred_patient_id uuid references public.patients,
  reward_status text check (reward_status in ('pending', 'credited')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.invoices enable row level security;
alter table public.reviews enable row level security;
alter table public.referrals enable row level security;

-- Helper security definer functions to get user credentials avoiding recursion
create or replace function public.get_my_clinic_id()
returns uuid
language sql
security definer
stable
as $$
  select clinic_id from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Trigger: Copy Auth User to Public Profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, role, is_active, clinic_id, specialization)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    true,
    (new.raw_user_meta_data->>'clinic_id')::uuid,
    new.raw_user_meta_data->>'specialization'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies

-- 1. Clinics Table Policies
create policy "Allow read access to clinic profile"
  on public.clinics for select
  using (id = public.get_my_clinic_id() or auth.role() = 'anon');

create policy "Allow update access to clinic admins"
  on public.clinics for update
  using (id = public.get_my_clinic_id() and public.get_my_role() = 'admin');

-- 2. Profiles Table Policies
create policy "Allow select access to profiles"
  on public.profiles for select
  using (id = auth.uid() or clinic_id = public.get_my_clinic_id());

create policy "Allow admin to insert profiles"
  on public.profiles for insert
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin');

create policy "Allow update access to profiles"
  on public.profiles for update
  using (id = auth.uid() or (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin'));

-- 3. Patients Table Policies
create policy "Allow staff, doctor, admin to select patients"
  on public.patients for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow staff, doctor, admin to insert patients"
  on public.patients for insert
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow staff, doctor, admin to update patients"
  on public.patients for update
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow staff, doctor, admin to delete patients"
  on public.patients for delete
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow patient to select own record"
  on public.patients for select
  using (phone = auth.jwt()->>'phone' and clinic_id = public.get_my_clinic_id());

-- 4. Appointments Table Policies
create policy "Allow staff, doctor, admin to select appointments"
  on public.appointments for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow staff, doctor, admin to insert appointments"
  on public.appointments for insert
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow staff, doctor, admin to update appointments"
  on public.appointments for update
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow patients to select own appointments"
  on public.appointments for select
  using (patient_id in (select id from public.patients where phone = auth.jwt()->>'phone') and clinic_id = public.get_my_clinic_id());

create policy "Allow patients to book own appointments"
  on public.appointments for insert
  with check (
    clinic_id = public.get_my_clinic_id() and
    patient_id in (select id from public.patients where phone = auth.jwt()->>'phone')
  );

create policy "Allow patients to update own appointments"
  on public.appointments for update
  using (
    clinic_id = public.get_my_clinic_id() and
    patient_id in (select id from public.patients where phone = auth.jwt()->>'phone')
  );

-- 5. Medical Records Table Policies
create policy "Allow doctor, admin to select medical_records"
  on public.medical_records for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor'));

create policy "Allow staff to select medical_records"
  on public.medical_records for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'staff');

create policy "Allow patient to select own medical_records"
  on public.medical_records for select
  using (patient_id in (select id from public.patients where phone = auth.jwt()->>'phone') and clinic_id = public.get_my_clinic_id());

create policy "Allow doctor, admin to insert medical_records"
  on public.medical_records for insert
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor'));

create policy "Allow doctor, admin to update medical_records"
  on public.medical_records for update
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor'));

-- 6. Invoices Table Policies
create policy "Allow staff, admin to select invoices"
  on public.invoices for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'staff'));

create policy "Allow doctor to select invoices"
  on public.invoices for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'doctor');

create policy "Allow patient to select own invoices"
  on public.invoices for select
  using (patient_id in (select id from public.patients where phone = auth.jwt()->>'phone') and clinic_id = public.get_my_clinic_id());

create policy "Allow staff, admin to insert invoices"
  on public.invoices for insert
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'staff'));

create policy "Allow staff, admin to update invoices"
  on public.invoices for update
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'staff'));

-- 7. Reviews Table Policies
create policy "Allow clinic users to select reviews"
  on public.reviews for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

create policy "Allow patients to insert reviews"
  on public.reviews for insert
  with check (
    clinic_id = public.get_my_clinic_id() and
    patient_id in (select id from public.patients where phone = auth.jwt()->>'phone')
  );

-- 8. Referrals Table Policies
create policy "Allow staff, admin to select referrals"
  on public.referrals for select
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'staff'));

create policy "Allow patient to select own referrals"
  on public.referrals for select
  using (referring_patient_id in (select id from public.patients where phone = auth.jwt()->>'phone') and clinic_id = public.get_my_clinic_id());

create policy "Allow patient to insert own referrals"
  on public.referrals for insert
  with check (
    clinic_id = public.get_my_clinic_id() and
    referring_patient_id in (select id from public.patients where phone = auth.jwt()->>'phone')
  );
