-- Seed Nurse User in auth.users
insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  instance_id,
  aud,
  raw_user_meta_data,
  raw_app_meta_data,
  is_anonymous,
  is_sso_user,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  reauthentication_token
)
values (
  '55555555-0000-0000-0000-555555555555',
  'nurse@apex.com',
  '$2a$10$7v1b1F36612v1z71607iReF3Wd9TzHpxl027u5.772594zL8o3z4C', -- 'password123'
  now(),
  'authenticated',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  '{"name": "Nancy Nurse", "role": "nurse", "clinic_id": "11111111-1111-1111-1111-111111111111"}',
  '{"provider": "email", "providers": ["email"]}',
  false,
  false,
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- Seed Nurse in public.profiles
insert into public.profiles (id, clinic_id, name, role, specialization, is_active)
values (
  '55555555-0000-0000-0000-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Nancy Nurse',
  'nurse',
  null,
  true
)
on conflict (id) do nothing;

-- Seed Departments
insert into public.departments (id, clinic_id, name, code, description, head_doctor_id, is_active)
values 
  ('12121212-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'Cardiology', 'CARD', 'Heart and cardiovascular care', '22222222-2222-2222-2222-222222222222', true),
  ('23232323-2323-2323-2323-232323232323', '11111111-1111-1111-1111-111111111111', 'Pediatrics', 'PED', 'Child health and pediatric services', null, true)
on conflict (id) do nothing;

-- Seed Beds (IPD)
insert into public.beds (id, clinic_id, room_no, bed_no, ward_type, rate_per_day, status)
values 
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '11111111-1111-1111-1111-111111111111', 'ICU-01', 'Bed-A', 'icu', 5000.00, 'available'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '11111111-1111-1111-1111-111111111111', 'General-10', 'Bed-B', 'general', 1500.00, 'occupied')
on conflict (id) do nothing;

-- Seed IPD Admissions
insert into public.ipd_admissions (id, clinic_id, patient_id, bed_id, doctor_id, provisional_diagnosis, treatment_logs, status)
values (
  'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444', -- Jane Doe
  'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', -- Bed-B
  '22222222-2222-2222-2222-222222222222', -- Dr. Shubham Kumar
  'Severe Hypertension Monitoring',
  '[{"date": "2026-06-26T10:00:00Z", "note": "Patient admitted. BP: 160/100. Rest prescribed."}]'::jsonb,
  'admitted'
)
on conflict (id) do nothing;

-- Seed Pharmacy Medicines
insert into public.pharmacy_medicines (id, clinic_id, name, generic_name, sku, batch_no, expiry_date, stock_qty, price_per_unit)
values 
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', '11111111-1111-1111-1111-111111111111', 'Paracetamol 500mg', 'Paracetamol', 'MED-PARA500', 'BATCH-P102', '2027-12-31', 150, 5.00),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '11111111-1111-1111-1111-111111111111', 'Amlodipine 5mg', 'Amlodipine', 'MED-AMLO5', 'BATCH-A405', '2028-06-30', 120, 8.50)
on conflict (id) do nothing;

-- Seed Lab Tests
insert into public.lab_tests (id, clinic_id, name, code, price)
values 
  ('f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', '11111111-1111-1111-1111-111111111111', 'Complete Blood Count', 'CBC', 350.00),
  ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', '11111111-1111-1111-1111-111111111111', 'Lipid Profile', 'LIPID', 750.00)
on conflict (id) do nothing;

-- Seed Lab Requests
insert into public.lab_requests (id, clinic_id, patient_id, doctor_id, test_id, status)
values (
  'b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8b8',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444', -- Jane Doe
  '22222222-2222-2222-2222-222222222222', -- Dr. Shubham Kumar
  'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', -- CBC test
  'pending'
)
on conflict (id) do nothing;

-- Seed Inventory Items
insert into public.inventory_items (id, clinic_id, name, category, stock_qty, min_stock_alert, price_per_unit)
values 
  ('c9c9c9c9-c9c9-c9c9-c9c9-c9c9c9c9c9c9', '11111111-1111-1111-1111-111111111111', 'Syringes 5ml', 'consumables', 500, 50, 10.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', '11111111-1111-1111-1111-111111111111', 'Stethoscopes', 'equipment', 10, 2, 1500.00)
on conflict (id) do nothing;

-- Seed Nurse Assignments
insert into public.nurse_assignments (id, clinic_id, nurse_id, assigned_ward, shift, start_date)
values (
  'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
  '11111111-1111-1111-1111-111111111111',
  '55555555-0000-0000-0000-555555555555', -- Nancy Nurse
  'ICU Ward',
  'morning',
  '2026-06-26'
)
on conflict (id) do nothing;

-- Seed Reception Visitor Logs
insert into public.reception_logs (id, clinic_id, visitor_name, purpose, phone, status)
values 
  ('f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', '11111111-1111-1111-1111-111111111111', 'Rahul Sharma', 'inquiry', '+919999911111', 'waiting'),
  ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', '11111111-1111-1111-1111-111111111111', 'Anita Desai', 'appointment', '+919999922222', 'served')
on conflict (id) do nothing;
