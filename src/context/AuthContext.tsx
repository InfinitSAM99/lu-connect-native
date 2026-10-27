import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { initPushNotifications, clearPushToken } from '../lib/notifications';
import { getDeviceId } from '../lib/deviceAuth';

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
  const [kickoutReason, setKickoutReason] = useState<string | null>(null);
  const [transferRequest, setTransferRequest] = useState<string | null>(null);
  const queryClient = useQueryClient();
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
      // ─── Session Lock: single-device enforcement ─────────────────
      const myDeviceId = await getDeviceId();
      const { data: current } = await supabase
        .from('profiles')
        .select('active_device_id')
        .eq('id', uid)
        .maybeSingle();

      if (current?.active_device_id && current.active_device_id !== myDeviceId) {
        // Another device is active — request a transfer instead of taking over
        await supabase.from('profiles').update({ transfer_request_id: myDeviceId }).eq('id', uid);

        // Poll for up to 60s: approved, rejected, or timeout
        const start = Date.now();
        let approved = false;
        while (Date.now() - start < 60000) {
          await new Promise(r => setTimeout(r, 1500));
          const { data: check } = await supabase
            .from('profiles')
            .select('active_device_id, transfer_request_id')
            .eq('id', uid)
            .maybeSingle();

          if (check?.active_device_id === myDeviceId) { approved = true; break; }
          if (!check?.transfer_request_id) {
            // Rejected by the active device
            setKickoutReason('The active device denied the transfer. You have been signed out.');
            await supabase.auth.signOut();
            return null;
          }
        }
        if (!approved) {
          setKickoutReason('The transfer request timed out. You have been signed out.');
          await supabase.auth.signOut();
          return null;
        }
      } else {
        // No active device, or we already are the active device — claim it
        await supabase.from('profiles').update({ active_device_id: myDeviceId, transfer_request_id: null }).eq('id', uid);
      }
      // ─────────────────────────────────────────────────────────────

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

  // Verify this device is still the active one (called on app resume / mount)
  const verifyActiveDevice = async () => {
    if (!user?.id) return;
    try {
      const myDeviceId = await getDeviceId();
      const { data } = await supabase.from('profiles')
        .select('active_device_id, transfer_request_id')
        .eq('id', user.id)
        .maybeSingle();

      // 1. If someone else requested a transfer to their device, show the modal (don't kick)
      if (data?.transfer_request_id && data.transfer_request_id !== myDeviceId) {
        setTransferRequest(data.transfer_request_id);
        return;
      }

      // 2. If another device is already the active one, we've been replaced → kick out
      if (data?.active_device_id && data.active_device_id !== myDeviceId) {
        setKickoutReason('Your account was opened on another device. You have been signed out.');
        await supabase.auth.signOut();
      }
    } catch {}
  };

  const approveTransfer = async () => {
    if (!transferRequest || !user?.id) return;
    try {
      await supabase.from('profiles').update({
        active_device_id: transferRequest,
        transfer_request_id: null,
      }).eq('id', user.id);
      setTransferRequest(null);
      setKickoutReason('You transferred your session to another device.');
      await supabase.auth.signOut();
    } catch (e) {
      console.error('approveTransfer failed:', e);
    }
  };

  const rejectTransfer = async () => {
    if (!user?.id) return;
    try {
      await supabase.from('profiles').update({ transfer_request_id: null }).eq('id', user.id);
      setTransferRequest(null);
    } catch (e) {
      console.error('rejectTransfer failed:', e);
    }
  };

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

  // Listen for account being used on another device (session lock)
  useEffect(() => {
    if (!profile?.id) return;

    const ch = supabase.channel(`device-kickout-${profile.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`
      }, async (payload: any) => {
        const myDeviceId = await getDeviceId();
        const remoteDeviceId = payload.new?.active_device_id;
        const pendingTransfer = payload.new?.transfer_request_id;
        
        // If someone else is trying to log in and we haven't approved yet
        if (pendingTransfer && pendingTransfer !== myDeviceId) {
           // Show the transfer request prompt
           setTransferRequest(pendingTransfer);
        } else if (remoteDeviceId && remoteDeviceId !== myDeviceId) {
           // If they forced it (or approved)
           setKickoutReason('Your account was opened on another device. You have been signed out.');
           await supabase.auth.signOut();
        }
      });

    const timer = setTimeout(() => ch.subscribe(), 200);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [profile?.id]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, signIn, signUp, signOut, resetPassword, kickoutReason, transferRequest, approveTransfer, rejectTransfer, reloadProfile: () => loadProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
