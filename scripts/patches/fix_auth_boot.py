file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace the problematic boot useEffect with a cleaner, more robust one
import re
old_boot = re.search(r"  useEffect\(\(\) => \{\n    if \(!cacheHydrated\) return;.*?  \}, \[cacheHydrated\]\);", content, re.DOTALL)

new_boot = """  useEffect(() => {
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
  }, [cacheHydrated]); // REMOVED user?.id so it doesn't loop infinitely"""

if old_boot:
    content = content.replace(old_boot.group(0), new_boot)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully replaced the boot sequence in AuthContext.")
else:
    print("Error: Could not find the boot sequence to replace.")
