-- Seed Clinic
insert into public.clinics (id, name, address, phone, subscription_plan, is_active)
values ('11111111-1111-1111-1111-111111111111', 'Apex Family Clinic', '123 MG Road, Mumbai', '+91 22 2345 6789', 'basic', true)
on conflict (id) do nothing;

-- Seed Doctor
insert into auth.users (id, email, encrypted_password, email_confirmed_at, role, instance_id, aud, raw_user_meta_data)
values (
  '22222222-2222-2222-2222-222222222222', 
  'doctor@apex.com', 
  '$2a$10$7v1b1F36612v1z71607iReF3Wd9TzHpxl027u5.772594zL8o3z4C', -- Hashed 'password123'
  now(), 
  'authenticated', 
  '00000000-0000-0000-0000-000000000000', 
  'authenticated',
  '{"name": "Shubham Kumar", "role": "doctor", "clinic_id": "11111111-1111-1111-1111-111111111111", "specialization": "Cardiologist"}'
)
on conflict (id) do nothing;

-- Seed Staff
insert into auth.users (id, email, encrypted_password, email_confirmed_at, role, instance_id, aud, raw_user_meta_data)
values (
  '33333333-3333-3333-3333-333333333333', 
  'staff@apex.com', 
  '$2a$10$7v1b1F36612v1z71607iReF3Wd9TzHpxl027u5.772594zL8o3z4C', -- Hashed 'password123'
  now(), 
  'authenticated', 
  '00000000-0000-0000-0000-000000000000', 
  'authenticated',
  '{"name": "Sarah Jones", "role": "staff", "clinic_id": "11111111-1111-1111-1111-111111111111"}'
)
on conflict (id) do nothing;

-- Seed Patients
insert into public.patients (id, clinic_id, name, phone, dob, gender, address)
values 
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Jane Doe', '+919876543210', '1995-05-15', 'Female', 'Flat 402, Sea Breeze, Bandra, Mumbai'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'John Smith', '+919999988888', '1988-10-20', 'Male', 'Flat 101, Oakwood Apartments, Andheri, Mumbai')
on conflict (id) do nothing;

-- Seed Medical Records
insert into public.medical_records (id, clinic_id, patient_id, doctor_id, visit_date, diagnosis, prescriptions, attachments)
values 
  (
    '66666666-6666-6666-6666-666666666666', 
    '11111111-1111-1111-1111-111111111111', 
    '44444444-4444-4444-4444-444444444444', 
    '22222222-2222-2222-2222-222222222222', 
    '2026-06-10', 
    'Hypertension', 
    '[{"medication": "Amlodipine", "dosage": "5 mg", "frequency": "1-0-0", "duration": "30 Days"}, {"medication": "Telmisartan", "dosage": "40 mg", "frequency": "0-0-1", "duration": "30 Days"}]'::jsonb,
    '[]'::jsonb
  ),
  (
    '77777777-7777-7777-7777-777777777777', 
    '11111111-1111-1111-1111-111111111111', 
    '44444444-4444-4444-4444-444444444444', 
    '22222222-2222-2222-2222-222222222222', 
    '2026-06-25', 
    'Migraine', 
    '[{"medication": "Sumatriptan", "dosage": "50 mg", "frequency": "As needed", "duration": "10 Days"}]'::jsonb,
    '[]'::jsonb
  )
on conflict (id) do nothing;

-- Seed Invoices
insert into public.invoices (id, clinic_id, patient_id, total_amount, payment_status, payment_method, issued_date)
values 
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 1200.00, 'paid', 'UPI', '2026-06-10'),
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 800.00, 'unpaid', null, '2026-06-25')
on conflict (id) do nothing;
