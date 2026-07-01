-- Create billing rates table
create table public.billing_rates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  name text not null,
  category text check (category in ('consultation', 'ipd_bed', 'laboratory', 'pharmacy', 'other')) not null,
  price numeric(10, 2) not null check (price >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint rate_name_unique unique (clinic_id, name)
);

-- Enable RLS
alter table public.billing_rates enable row level security;

-- Policies
create policy "Allow staff, doctor, admin to manage billing_rates"
  on public.billing_rates for all
  using (clinic_id = public.get_my_clinic_id())
  with check (clinic_id = public.get_my_clinic_id());

create policy "Allow public read access to clinic billing rates"
  on public.billing_rates for select
  using (clinic_id = public.get_my_clinic_id() or auth.role() = 'anon');

-- Seed basic default billing rates for existing clinic
insert into public.billing_rates (clinic_id, name, category, price)
values 
  ('11111111-1111-1111-1111-111111111111', 'General OPD Consultation', 'consultation', 500.00),
  ('11111111-1111-1111-1111-111111111111', 'ICU Bed (Per Day)', 'ipd_bed', 5000.00),
  ('11111111-1111-1111-1111-111111111111', 'General Ward Bed (Per Day)', 'ipd_bed', 1500.00),
  ('11111111-1111-1111-1111-111111111111', 'Complete Blood Count (CBC) Lab Test', 'laboratory', 350.00)
on conflict (clinic_id, name) do nothing;
