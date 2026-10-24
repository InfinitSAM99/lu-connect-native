import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { getJSON, setJSON } from '../lib/storage';

const AuthContext = createContext<any>(null);

const USER_CACHE_KEY = 'lu:cachedUser';
const PROFILE_CACHE_KEY = 'lu:cachedProfile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cacheHydrated, setCacheHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [cachedUser, cachedProfile] = await Promise.all([
        getJSON(USER_CACHE_KEY),
        getJSON(PROFILE_CACHE_KEY),
      ]);
      if (!active) return;
      if (cachedUser) setUser(cachedUser);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedUser) setLoading(false);
      setCacheHydrated(true);
    })();
    return () => { active = false; };
  }, []);

  const loadProfile = async (uid: string) => {
    if (!uid) {
      setProfile(null);
      await setJSON(PROFILE_CACHE_KEY, null);
      return null;
    }
    const existing = await getJSON(PROFILE_CACHE_KEY);
    if (existing && existing.id === uid) setProfile(existing);
    const state = await NetInfo.fetch();
    if (!state.isConnected) return existing;
    try {
      const { data } = await supabase.from('profiles').select('*, roles(name,level)').eq('id', uid).single();
      if (data) {
        setProfile(data);
        await setJSON(PROFILE_CACHE_KEY, data);
      }
      return data;
    } catch { return existing; }
  };

  useEffect(() => {
    if (!cacheHydrated) return;
    let mounted = true;
    const boot = async () => {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user ?? null;
        if (!mounted) return;
        setUser(sessionUser);
        await setJSON(USER_CACHE_KEY, sessionUser);
        if (sessionUser?.id) await loadProfile(sessionUser.id);
        else {
          setProfile(null);
          await setJSON(PROFILE_CACHE_KEY, null);
        }
      } catch {} finally { if (mounted) setLoading(false); }
    };
    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      await setJSON(USER_CACHE_KEY, sessionUser);
      if (sessionUser?.id) await loadProfile(sessionUser.id);
      else {
        setProfile(null);
        await setJSON(PROFILE_CACHE_KEY, null);
      }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [cacheHydrated]);

  const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signUp = (email: string, password: string, fullName: string, username: string, admissionNumber: string) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, username, admission_number: admissionNumber } } });
  const signOut = async () => {
    await setJSON(USER_CACHE_KEY, null);
    await setJSON(PROFILE_CACHE_KEY, null);
    return supabase.auth.signOut();
  };
  const resetPassword = (email: string) => supabase.auth.resetPasswordForEmail(email, { redirectTo: Linking.createURL('/reset-password') });

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, resetPassword, reloadProfile: () => loadProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
