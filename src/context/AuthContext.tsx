import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { initPushNotifications, clearPushToken } from '../lib/notifications';
import { getDeviceId } from '../lib/deviceAuth';
import { runSecurityCheck } from '../lib/security';

const AuthContext = createContext<any>(null);
const USER_CACHE_KEY = 'lu:cachedUser';
const PROFILE_CACHE_KEY = 'lu:cachedProfile';
const SAVED_ACCOUNTS_KEY = 'lu:savedAccounts';

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
  const [kickoutReason, setKickoutReason] = useState<string | null>(null);
  const [deviceBanned, setDeviceBanned] = useState(false);
  const [transferRequest, setTransferRequest] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    (async () => {
      const [cachedUser, cachedProfile, cachedAccounts] = await Promise.all([
        getJSON(USER_CACHE_KEY), 
        getJSON(PROFILE_CACHE_KEY),
        getJSON(SAVED_ACCOUNTS_KEY)
      ]);
      if (!active) return;
      if (cachedUser) setUser(cachedUser);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedUser) setLoading(false);
      setCacheHydrated(true);
    })();
    return () => { active = false; };
  }, []);


  const saveActiveAccountToVault = async (sessionUser: any, session: any) => {
    if (!sessionUser || !session) return;
    
    // Fetch the real profile from the DB so we get the actual avatar and name
    const { data: realProfile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', sessionUser.id)
      .maybeSingle();

    const newAccount = {
      id: sessionUser.id,
      email: sessionUser.email,
      full_name: realProfile?.full_name || sessionUser.user_metadata?.full_name || 'User',
      avatar_url: realProfile?.avatar_url || sessionUser.user_metadata?.avatar_url || '',
      refresh_token: session.refresh_token,
    };
    
    if (!uid) { setProfile(null); await setJSON(PROFILE_CACHE_KEY, null); return null; }
    try {
      // Force fetch fresh data from the database
      const myDeviceId = await getDeviceId();
      const { data: current } = await supabase.from('profiles').select('active_device_id, transfer_request_id').eq('id', uid).maybeSingle();

      if (current?.active_device_id && current.active_device_id !== myDeviceId) {
        await supabase.from('profiles').update({ transfer_request_id: myDeviceId }).eq('id', uid);
        // Immediately set kickout reason so the app doesn't hang on a white screen
        setKickoutReason('Another device is currently logged into this account. Please approve the transfer on your other phone, or wait.');
        return null;
      } else {
        await supabase.from('profiles').update({ active_device_id: myDeviceId, transfer_request_id: null }).eq('id', uid);
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (data) {
        setProfile(data);
        await setJSON(PROFILE_CACHE_KEY, data);
      }
      return data;
    } catch (e: any) { 
      console.error('PROFILE FETCH ERROR:', e.message); 
      return null; 
    }
  };


  const loadProfile = async (uid?: string) => {
    if (!uid) { setProfile(null); await setJSON(PROFILE_CACHE_KEY, null); return null; }
    try {
      const myDeviceId = await getDeviceId();
      const { data: current } = await supabase.from('profiles').select('active_device_id, transfer_request_id').eq('id', uid).maybeSingle();

      if (current?.active_device_id && current.active_device_id !== myDeviceId) {
        await supabase.from('profiles').update({ transfer_request_id: myDeviceId }).eq('id', uid);
        setKickoutReason('Another device is currently logged into this account. Please approve the transfer on your other phone, or wait.');
        return null;
      } else {
        await supabase.from('profiles').update({ active_device_id: myDeviceId, transfer_request_id: null }).eq('id', uid);
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (data) {
        setProfile(data);
        await setJSON(PROFILE_CACHE_KEY, data);
      }
      return data;
    } catch (e: any) {
      console.error('PROFILE FETCH ERROR:', e.message);
      return null;
    }
  };

  useEffect(() => {
    if (!cacheHydrated) return;
    let mounted = true;

    const boot = async () => {
      try {
        // 1. Check Device Ban
        const myDeviceId = await getDeviceId();
        const { data: banned } = await supabase.from('banned_devices').select('device_id').eq('device_id', myDeviceId).maybeSingle();
        
        if (banned) {
          if (mounted) { setDeviceBanned(true); setLoading(false); }
          return;
        }

        // 2. Check Session
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user ?? null;
        if (!mounted) return;
        
        setUser(sessionUser);
        await setJSON(USER_CACHE_KEY, sessionUser);

        // 3. Load Profile (Await it before turning off loading!)
        if (sessionUser?.id) {
          await loadProfile(sessionUser.id);
          initPushNotifications(sessionUser.id);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('BOOT ERROR:', e);
      } finally {
        // This runs no matter what, killing the infinite spinner
        if (mounted) setLoading(false);
      }
    };
    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e: any, session: any) => {
      const sessionUser = session?.user ?? null;
      if (!mounted) return;
      setUser(sessionUser);
      await setJSON(USER_CACHE_KEY, sessionUser);
      
      if (sessionUser?.id) {
        await loadProfile(sessionUser.id);
        initPushNotifications(sessionUser.id);
      } else {
        setProfile(null);
        await setJSON(PROFILE_CACHE_KEY, null);
      }
    });

    let interval: any = null;
    const updateHeartbeat = async () => {
      if (AppState.currentState !== 'active' || !user?.id) return;
      try { await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id); } catch {}
    };
    const startHeartbeat = () => { if (interval) return; updateHeartbeat(); interval = setInterval(updateHeartbeat, 30000); };
    const stopHeartbeat = () => { if (interval) clearInterval(interval); interval = null; };
    if (user?.id) startHeartbeat();
    
    const appSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') startHeartbeat();
      else stopHeartbeat();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      stopHeartbeat();
      appSub.remove();
    };
  }, [cacheHydrated]); // REMOVED user?.id so it doesn't loop infinitely

  // Realtime: Session Lock + Ban Kickout
  useEffect(() => {
    if (!profile?.id) return;

    const ch = supabase.channel(`device-kickout-${profile.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`
      }, async (payload: any) => {
        const newStatus = payload.new?.approval_status;
        const myDeviceId = await getDeviceId();
        const remoteDeviceId = payload.new?.active_device_id;
        const pendingTransfer = payload.new?.transfer_request_id;

        // 1. BAN CHECK (Highest Priority)
        if (newStatus === 'banned' || newStatus === 'high_ban') {
          setProfile((prev: any) => prev ? { ...prev, approval_status: newStatus } : prev);
          // Alert removed for premium UI
          return; // Do NOT sign out, let AppNavigator route to AppealScreen
        }

        // 2. SESSION LOCK
        if (pendingTransfer && pendingTransfer !== myDeviceId) {
          setTransferRequest(pendingTransfer);
        } else if (remoteDeviceId && remoteDeviceId !== myDeviceId) {
          setKickoutReason('Your account was opened on another device.');
        }
      });

    const timer = setTimeout(() => ch.subscribe(), 200);
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [profile?.id]);

  const unlockSession = async () => {
    // 1. Clear local memory immediately
    setKickoutReason(null);
    setTransferRequest(null);
    
    // 2. Fetch fresh profile from DB (which now has active_device_id = null)
    if (user?.id) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        // 3. Re-claim the device ID so the app stays logged in on this phone
        const myDeviceId = await getDeviceId();
        await supabase.from('profiles').update({ active_device_id: myDeviceId }).eq('id', user.id);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) {
      // Log the failed attempt with IP
      await supabase.rpc('log_security_event', {
        p_event_type: 'failed_login',
        p_email: email,
        p_details: { error: res.error.message }
      });
    } else {
      // Run the device security check on successful login
      runSecurityCheck(email);
    }
    return res;
  };
  const signUp = (email: string, password: string, fullName: string, username: string, admissionNumber: string, universityName: string, universityId: string) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, username, admission_number: admissionNumber, university_name: universityName, university_id: universityId } } });

  const switchAccount = async (account: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: account.refresh_token,
      });
      
      if (error) throw error;
    } catch (e: any) {
      console.error('Switch failed:', e.message);
      setLoading(false);
      
      // If the token is dead, automatically remove this account from the UI so the user isn't stuck
      if (e.message.includes('Invalid Refresh Token') || e.message.includes('missing') || e.message.includes('Not Found')) {
      }
    }
  };

  const addAccount = async () => {
    // Sign out but DO NOT clear the saved accounts list
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    await setJSON(USER_CACHE_KEY, null);
    await setJSON(PROFILE_CACHE_KEY, null);
  };

  const loginForAddAccount = async (email: string, password: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) throw new Error(res.error.message);
    return res;
  };

  const signOut = async () => {
    if (user?.id) { try { await clearPushToken(user.id); } catch {} }
    setProfile(null);
    await setJSON(USER_CACHE_KEY, null);
    await setJSON(PROFILE_CACHE_KEY, null);
    try { queryClient.clear(); } catch {}
    return supabase.auth.signOut();
  };

  const resetPassword = (email: string) => {
    const redirectUrl = Linking.createURL('/reset-password');
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
  };

  const approveTransfer = async () => {
    if (!transferRequest || !user?.id) return;
    try {
      await supabase.from('profiles').update({ active_device_id: transferRequest, transfer_request_id: null }).eq('id', user.id);
      setTransferRequest(null);
      setKickoutReason('You transferred your session to another device.');
      await supabase.auth.signOut();
    } catch (e) { console.error('approveTransfer failed:', e); }
  };

  const rejectTransfer = async () => {
    if (!user?.id) return;
    try {
      await supabase.from('profiles').update({ transfer_request_id: null }).eq('id', user.id);
      setTransferRequest(null);
    } catch (e) { console.error('rejectTransfer failed:', e); }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, setProfile,
      signIn, signUp, signOut, resetPassword,
      kickoutReason, transferRequest, deviceBanned,
      approveTransfer, rejectTransfer, unlockSession,
      reloadProfile: () => loadProfile(user?.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
