import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { useBookingStore } from '../store/useBookingStore';

const VKU_EMAIL_PATTERN = /^[^@\s]+@vku\.udn\.vn$/i;

export function isVkuEmail(email: string) {
  return VKU_EMAIL_PATTERN.test(email.trim());
}

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const setUser = useBookingStore((state) => state.setUser);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setSession(null);
      setUser(null);
      return;
    }

    let mounted = true;
    let authEventReceived = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      setSession(nextSession);
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || authEventReceived) return;
      setSession(error ? null : data.session);
      setLoading(false);
    }).catch(() => {
      if (!mounted || authEventReceived) return;
      setSession(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setUser]);

  useEffect(() => {
    const email = session?.user.email?.trim().toLowerCase();
    if (!email || !isVkuEmail(email)) {
      setUser(null);
      return;
    }

    setUser({
      email,
      name: email.split('@')[0],
      studentId: 'Not provided',
      department: 'VKU email account',
      cohort: 'Not provided',
      avatarUrl: '',
    });
  }, [session, setUser]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    configured: isSupabaseConfigured,
    sendEmailOtp: async (email) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!isVkuEmail(normalizedEmail)) {
        throw new Error('Use your @vku.udn.vn email address.');
      }
      if (!supabase) throw new Error('Supabase is not configured yet.');
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
    },
    verifyEmailOtp: async (email, token) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!isVkuEmail(normalizedEmail)) throw new Error('Use your @vku.udn.vn email address.');
      if (!/^\d{6}$/.test(token.trim())) throw new Error('Enter the 6-digit code from your email.');
      if (!supabase) throw new Error('Supabase is not configured yet.');
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: token.trim(),
        type: 'email',
      });
      if (error) throw new Error(error.message);
    },
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
