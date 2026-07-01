-- Add INSERT policy for clinics to allow new clinic onboarding (anonymous signups)
create policy "Allow anonymous inserts to clinics"
  on public.clinics for insert
  with check (true);
