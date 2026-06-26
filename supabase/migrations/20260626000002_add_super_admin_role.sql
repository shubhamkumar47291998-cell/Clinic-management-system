-- Update role check constraint in profiles to support super_admin
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('super_admin', 'admin', 'doctor', 'staff', 'patient'));
