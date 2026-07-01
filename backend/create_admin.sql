DO $$
BEGIN
  -- Update existing users passwords
  update auth.users
  set encrypted_password = '$2a$10$7v1b1F36612v1z71607iReF3Wd9TzHpxl027u5.772594zL8o3z4C'
  where email in ('doctor@apex.com', 'staff@apex.com');

  -- Insert Clinic Admin
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
    is_sso_user
  )
  values (
    '99999999-0000-0000-0000-999999999999',
    'admin@apex.com',
    '$2a$10$7v1b1F36612v1z71607iReF3Wd9TzHpxl027u5.772594zL8o3z4C',
    now(),
    'authenticated',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    '{"name": "Clinic Admin", "role": "admin", "clinic_id": "11111111-1111-1111-1111-111111111111"}',
    '{"provider": "email", "providers": ["email"]}',
    false,
    false
  )
  on conflict (id) do nothing;

  insert into public.profiles (id, clinic_id, name, role, specialization, is_active)
  values (
    '99999999-0000-0000-0000-999999999999',
    '11111111-1111-1111-1111-111111111111',
    'Clinic Admin',
    'admin',
    null,
    true
  )
  on conflict (id) do nothing;

  -- Insert Super Admin
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
    is_sso_user
  )
  values (
    '88888888-0000-0000-0000-888888888888',
    'superadmin@apex.com',
    '$2a$10$7v1b1F36612v1z71607iReF3Wd9TzHpxl027u5.772594zL8o3z4C',
    now(),
    'authenticated',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    '{"name": "Super Admin", "role": "super_admin", "clinic_id": "11111111-1111-1111-1111-111111111111"}',
    '{"provider": "email", "providers": ["email"]}',
    false,
    false
  )
  on conflict (id) do nothing;

  insert into public.profiles (id, clinic_id, name, role, specialization, is_active)
  values (
    '88888888-0000-0000-0000-888888888888',
    '11111111-1111-1111-1111-111111111111',
    'Super Admin',
    'super_admin',
    null,
    true
  )
  on conflict (id) do nothing;
END $$;
