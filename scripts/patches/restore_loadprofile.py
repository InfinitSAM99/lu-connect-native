file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. The missing function
load_profile_code = """
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
"""

# 2. Find the exact spot to insert it (right before the second useEffect)
anchor = "  useEffect(() => {\n    if (!cacheHydrated) return;"

if "const loadProfile =" not in content:
    content = content.replace(anchor, load_profile_code + "\n" + anchor)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully restored the loadProfile function.")
else:
    print("Error: loadProfile already exists in the file.")
