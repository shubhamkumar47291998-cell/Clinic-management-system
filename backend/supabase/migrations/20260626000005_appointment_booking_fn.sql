-- Postgres function to allow anonymous/public booking of appointments
create or replace function public.book_public_appointment(
  p_clinic_id uuid,
  p_doctor_id uuid,
  p_patient_name text,
  p_patient_phone text,
  p_patient_dob date,
  p_patient_gender text,
  p_slot_start timestamp with time zone,
  p_slot_end timestamp with time zone,
  p_notes text
)
returns json
language plpgsql
security definer -- runs with bypass RLS to insert patient & appointment
as $$
declare
  v_clinic_active boolean;
  v_doctor_active boolean;
  v_patient_id uuid;
  v_appointment_id uuid;
  v_conflict_count integer;
  v_result json;
begin
  -- 1. Validate clinic
  select is_active into v_clinic_active from public.clinics where id = p_clinic_id;
  if v_clinic_active is not true then
    raise exception 'The selected clinic is inactive or invalid.';
  end if;

  -- 2. Validate doctor
  select is_active into v_doctor_active from public.profiles 
  where id = p_doctor_id and clinic_id = p_clinic_id and role = 'doctor';
  if v_doctor_active is not true then
    raise exception 'The selected doctor is inactive or not found.';
  end if;

  -- 3. Check slot overlap
  select count(*) into v_conflict_count
  from public.appointments
  where doctor_id = p_doctor_id
    and status not in ('cancelled')
    and tstzrange(slot_start, slot_end) && tstzrange(p_slot_start, p_slot_end);
    
  if v_conflict_count > 0 then
    raise exception 'The selected time slot is already booked. Please choose another slot.';
  end if;

  -- 4. Find or create patient
  select id into v_patient_id 
  from public.patients 
  where clinic_id = p_clinic_id and phone = p_patient_phone;

  if v_patient_id is null then
    insert into public.patients (clinic_id, name, phone, dob, gender)
    values (p_clinic_id, p_patient_name, p_patient_phone, p_patient_dob, p_patient_gender)
    returning id into v_patient_id;
  end if;

  -- 5. Insert appointment
  insert into public.appointments (
    clinic_id, 
    patient_id, 
    doctor_id, 
    slot_start, 
    slot_end, 
    status, 
    notes
  )
  values (
    p_clinic_id, 
    v_patient_id, 
    p_doctor_id, 
    p_slot_start, 
    p_slot_end, 
    'confirmed', 
    p_notes
  )
  returning id into v_appointment_id;

  -- 6. Construct result
  v_result := json_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'patient_id', v_patient_id
  );

  return v_result;
exception
  when others then
    return json_build_object(
      'success', false,
      'message', SQLERRM
    );
end;
$$;
