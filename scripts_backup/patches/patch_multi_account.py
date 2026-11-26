file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the constant for saved accounts
content = content.replace(
    "const PROFILE_CACHE_KEY = 'lu:cachedProfile';",
    "const PROFILE_CACHE_KEY = 'lu:cachedProfile';\nconst SAVED_ACCOUNTS_KEY = 'lu:savedAccounts';"
)

# 2. Add savedAccounts state
content = content.replace(
    "  const [transferRequest, setTransferRequest] = useState<string | null>(null);",
    "  const [transferRequest, setTransferRequest] = useState<string | null>(null);\n  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);"
)

# 3. Hydrate saved accounts on boot
old_hydrate = """      const [cachedUser, cachedProfile] = await Promise.all([getJSON(USER_CACHE_KEY), getJSON(PROFILE_CACHE_KEY)]);
      if (!active) return;
      if (cachedUser) setUser(cachedUser);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedUser) setLoading(false);
      setCacheHydrated(true);"""

new_hydrate = """      const [cachedUser, cachedProfile, cachedAccounts] = await Promise.all([
        getJSON(USER_CACHE_KEY), 
        getJSON(PROFILE_CACHE_KEY),
        getJSON(SAVED_ACCOUNTS_KEY)
      ]);
      if (!active) return;
      if (cachedUser) setUser(cachedUser);
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedAccounts) setSavedAccounts(cachedAccounts);
      if (cachedUser) setLoading(false);
      setCacheHydrated(true);"""

content = content.replace(old_hydrate, new_hydrate)

# 4. Save the active account into the savedAccounts list whenever a successful login happens
# We will add a helper function
helper_func = """
  const saveActiveAccountToVault = async (sessionUser: any, session: any) => {
    if (!sessionUser || !session) return;
    const newAccount = {
      id: sessionUser.id,
      email: sessionUser.email,
      full_name: sessionUser.user_metadata?.full_name || 'User',
      avatar_url: sessionUser.user_metadata?.avatar_url || '',
      refresh_token: session.refresh_token, // Required to switch without password
    };
    
    setSavedAccounts((prev) => {
      const filtered = prev.filter(a => a.id !== newAccount.id);
      // MAXIMUM 2 ACCOUNTS
      if (filtered.length >= 2) return prev; 
      const updated = [...filtered, newAccount];
      setJSON(SAVED_ACCOUNTS_KEY, updated);
      return updated;
    });
  };
"""
content = content.replace("  const loadProfile = async (uid?: string) => {", helper_func + "\n  const loadProfile = async (uid?: string) => {")

# 5. Call the helper function inside the onAuthStateChange
old_auth_change = """      if (sessionUser?.id) {
        await loadProfile(sessionUser.id);
        initPushNotifications(sessionUser.id);
      } else {"""
new_auth_change = """      if (sessionUser?.id) {
        await saveActiveAccountToVault(sessionUser, session);
        await loadProfile(sessionUser.id);
        initPushNotifications(sessionUser.id);
      } else {"""
content = content.replace(old_auth_change, new_auth_change)

# 6. Add the switchAccount, addAccount, and update signOut functions
old_auth_funcs = """  const signOut = async () => {
    if (user?.id) { try { await clearPushToken(user.id); } catch {} }
    setProfile(null);
    await setJSON(USER_CACHE_KEY, null);
    await setJSON(PROFILE_CACHE_KEY, null);
    try { queryClient.clear(); } catch {}
    return supabase.auth.signOut();
  };"""

new_auth_funcs = """  const switchAccount = async (account: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: '', // We rely on refresh token for switching
        refresh_token: account.refresh_token,
      });
      if (error) throw error;
      // onAuthStateChange will handle the profile reload automatically
    } catch (e: any) {
      console.error('Switch failed:', e.message);
      setLoading(false);
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

  const signOut = async () => {
    if (user?.id) { try { await clearPushToken(user.id); } catch {} }
    setProfile(null);
    setSavedAccounts([]);
    await setJSON(USER_CACHE_KEY, null);
    await setJSON(PROFILE_CACHE_KEY, null);
    await setJSON(SAVED_ACCOUNTS_KEY, null); // Clear all accounts
    try { queryClient.clear(); } catch {}
    return supabase.auth.signOut();
  };"""

content = content.replace(old_auth_funcs, new_auth_funcs)

# 7. Export the new functions
old_export = """      kickoutReason, transferRequest, deviceBanned,
      approveTransfer, rejectTransfer, unlockSession,
      reloadProfile: () => loadProfile(user?.id),"""
new_export = """      kickoutReason, transferRequest, deviceBanned,
      approveTransfer, rejectTransfer, unlockSession,
      savedAccounts, switchAccount, addAccount,
      reloadProfile: () => loadProfile(user?.id),"""
content = content.replace(old_export, new_export)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched AuthContext with Multi-Account support.")
