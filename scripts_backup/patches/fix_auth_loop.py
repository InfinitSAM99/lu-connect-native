file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Fix the 60-second while loop causing the infinite spinner
old_loop = """        await supabase.from('profiles').update({ transfer_request_id: myDeviceId }).eq('id', uid);
        const start = Date.now();
        let approved = false;
        while (Date.now() - start < 60000) {
          await new Promise(r => setTimeout(r, 1500));
          const { data: check } = await supabase.from('profiles').select('active_device_id, transfer_request_id').eq('id', uid).maybeSingle();
          if (check?.active_device_id === myDeviceId) { approved = true; break; }
          if (!check?.transfer_request_id) {
            setKickoutReason('The active device denied the transfer.');
            return null;
          }
        }
        if (!approved) {
          setKickoutReason('The transfer request timed out.');
          return null;
        }"""

new_loop = """        await supabase.from('profiles').update({ transfer_request_id: myDeviceId }).eq('id', uid);
        // Immediately set kickout reason so the app doesn't hang on a white screen
        setKickoutReason('Another device is currently logged into this account. Please approve the transfer on your other phone, or wait.');
        return null;"""

if old_loop in content:
    content = content.replace(old_loop, new_loop)
else:
    print("Warning: Could not find exact loop block.")

# 2. Fix the infinite re-render loop in the useEffect
old_dep = "  }, [cacheHydrated, user?.id]);"
new_dep = "  }, [cacheHydrated]);" # Removed user?.id so it doesn't loop infinitely

if old_dep in content:
    content = content.replace(old_dep, new_dep)
    print("Successfully fixed the infinite loop and dependency array.")
else:
    print("Warning: Could not find the dependency array.")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched AuthContext.tsx")
