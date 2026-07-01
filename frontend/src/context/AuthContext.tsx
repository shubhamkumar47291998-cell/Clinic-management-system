import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  clinic_id: string | null;
  name: string;
  role: 'super_admin' | 'admin' | 'doctor' | 'staff' | 'patient' | 'nurse' | 'receptionist';
  specialization: string | null;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: any }>;
  signUpClinic: (
    clinicName: string,
    clinicAddress: string,
    clinicPhone: string,
    adminName: string,
    adminEmail: string,
    adminPassword: string
  ) => Promise<{ error: any; clinic?: any; user?: any }>;
  signOut: () => Promise<{ error: any }>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (password: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const prof = await fetchProfile(session.user.id);
        setProfile(prof);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          const prof = await fetchProfile(newSession.user.id);
          setProfile(prof);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithPhone = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpClinic = async (
    clinicName: string,
    clinicAddress: string,
    clinicPhone: string,
    adminName: string,
    adminEmail: string,
    adminPassword: string
  ) => {
    try {
      // 1. Create the clinic first
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: clinicName,
          address: clinicAddress,
          phone: clinicPhone,
          subscription_plan: 'basic',
          is_active: true
        })
        .select()
        .single();

      if (clinicError) {
        return { error: clinicError };
      }

      // 2. Sign up the user with metadata including the new clinic_id and admin role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            name: adminName,
            role: 'admin',
            clinic_id: clinic.id
          }
        }
      });

      if (authError) {
        // Rollback clinic creation if sign-up fails (optional but clean)
        await supabase.from('clinics').delete().eq('id', clinic.id);
        return { error: authError };
      }

      return { error: null, clinic, user: authData.user };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const resetPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithEmail,
        signInWithPhone,
        verifyOtp,
        signUpClinic,
        signOut,
        forgotPassword,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
