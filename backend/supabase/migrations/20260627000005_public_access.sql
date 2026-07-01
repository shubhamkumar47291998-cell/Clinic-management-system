-- Allow public select of active doctors
CREATE POLICY "Allow public select of active doctors" ON public.profiles
FOR SELECT TO public
USING (role = 'doctor' AND is_active = true);

-- Allow public select of active departments
CREATE POLICY "Allow public select of active departments" ON public.departments
FOR SELECT TO public
USING (is_active = true);
