import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signUpSecondaryUser = async (
  email: string,
  password: string,
  name: string,
  role: 'doctor' | 'staff' | 'patient' | 'nurse',
  clinicId: string,
  specialization?: string
) => {
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  return tempClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
        clinic_id: clinicId,
        specialization
      }
    }
  });
};

