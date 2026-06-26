-- Create storage bucket for medical attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 
  'attachments', 
  false, 
  52428800, -- 50 MB in bytes
  array['image/png', 'image/jpeg', 'application/pdf']
)
on conflict (id) do nothing;

-- Create policies for storage.objects
create policy "Allow staff, doctor, admin access to clinic attachments"
  on storage.objects for all
  using (
    bucket_id = 'attachments' 
    and split_part(name, '/', 1) = public.get_my_clinic_id()::text
    and public.get_my_role() in ('admin', 'doctor', 'staff')
  )
  with check (
    bucket_id = 'attachments' 
    and split_part(name, '/', 1) = public.get_my_clinic_id()::text
    and public.get_my_role() in ('admin', 'doctor', 'staff')
  );

create policy "Allow patients to read their own attachments"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) = public.get_my_clinic_id()::text
    and split_part(name, '/', 2) in (
      select id::text from public.patients where phone = auth.jwt()->>'phone'
    )
  );
