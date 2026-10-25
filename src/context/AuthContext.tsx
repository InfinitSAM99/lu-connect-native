import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { initPushNotifications, clearPushToken } from '../lib/notifications';

const AuthContext = createContext<any>(null);
const USER_CACHE_KEY = 'lu:cachedUser';
const PROFILE_CACHE_KEY = 'lu:cachedProfile';

const getJSON = async (key: string) => {
  try { const val = await AsyncStorage.getItem(key); return val ? JSON.parse(val) : null; } catch { return null; }
};
const setJSON = async (key: string, val: any) => {
  try {
    if (val === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cacheHydrated, setCacheHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [cachedUser, cachedProfile] = await Promise.all([getJSON(USER_CACHE_KEY), getJSON(PROFILE_CACHE_KEY)]);
      if (!active) return;
      if (cachedUser) setUser(cachedUser);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedUser) setLoading(false);
      setCacheHydrated(true);
    })();
    return () => { active = false; };
  }, []);

  const loadProfile = async (uid: string) => {
    if (!uid) { setProfile(null); await setJSON(PROFILE_CACHE_KEY, null); return null; }
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (data) {
        setProfile(data);
        await setJSON(PROFILE_CACHE_KEY, data);
      }
      return data;
    } catch { return null; }
  };

  useEffect(() => {
    if (!cacheHydrated) return;
    let mounted = true;
    const boot = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user ?? null;
        if (!mounted) return;
        setUser(sessionUser);
        await setJSON(USER_CACHE_KEY, sessionUser);
        if (sessionUser?.id) {
          await loadProfile(sessionUser.id);
          initPushNotifications(sessionUser.id);
        }
      } catch {} finally {
        if (mounted) setLoading(false);
      }
    };
    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e: any, session: any) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      await setJSON(USER_CACHE_KEY, sessionUser);
      if (sessionUser?.id) {
        await loadProfile(sessionUser.id);
        initPushNotifications(sessionUser.id);
      } else {
        setProfile(null);
      }
    });

    // Heartbeat
    let interval: any = null;
    const updateHeartbeat = async () => {
      if (AppState.currentState !== 'active' || !user?.id) return;
      try { await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id); } catch {}
    };
    const startHeartbeat = () => { if (interval) return; updateHeartbeat(); interval = setInterval(updateHeartbeat, 30000); };
    const stopHeartbeat = () => { if (interval) clearInterval(interval); interval = null; };
    if (user?.id) startHeartbeat();
    const appSub = AppState.addEventListener('change', (nextState) => { if (nextState === 'active') startHeartbeat(); else stopHeartbeat(); });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      stopHeartbeat();
      appSub.remove();
    };
  }, [cacheHydrated, user?.id]);

  const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signUp = (email: string, password: string, fullName: string, username: string, admissionNumber: string, universityName: string, universityId: string) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, username, admission_number: admissionNumber, university_name: universityName, university_id: universityId } } });

  const signOut = async () => {
    if (user?.id) { try { await clearPushToken(user.id); } catch {} }
    await setJSON(USER_CACHE_KEY, null);
    await setJSON(PROFILE_CACHE_KEY, null);
    return supabase.auth.signOut();
  };

  const resetPassword = (email: string) => {
    const redirectUrl = Linking.createURL('/reset-password');
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, signIn, signUp, signOut, resetPassword, reloadProfile: () => loadProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
