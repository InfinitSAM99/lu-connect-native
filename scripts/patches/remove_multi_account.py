file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Remove savedAccounts state
content = content.replace("  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);\n", "")

# 2. Remove the vault functions
content = content.replace("""  const saveActiveAccountToVault = async (sessionUser: any, session: any) => {
    if (!sessionUser || !session) return;
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
    setSavedAccounts((prev) => {
      const filtered = prev.filter(a => a.id !== newAccount.id);
      if (filtered.length >= 2) return prev; 
      const updated = [...filtered, newAccount];
      setJSON(SAVED_ACCOUNTS_KEY, updated);
      return updated;
    });
  };

""", "")

# 3. Remove the call to saveActiveAccountToVault in onAuthStateChange
content = content.replace("        await saveActiveAccountToVault(sessionUser, session);\n", "")

# 4. Remove switchAccount and addAccount functions
content = content.replace("""  const switchAccount = async (account: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: account.refresh_token,
      });
      if (error) throw error;
    } catch (e: any) {
      console.error('Switch failed:', e.message);
      setLoading(false);
      if (e.message.includes('Invalid Refresh Token') || e.message.includes('missing') || e.message.includes('Not Found')) {
         setSavedAccounts((prev) => {
            const updated = prev.filter(a => a.id !== account.id);
            setJSON(SAVED_ACCOUNTS_KEY, updated);
            return updated;
         });
      }
    }
  };

  const addAccount = async () => {
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

""", "")

# 5. Clean signOut
content = content.replace("    setSavedAccounts([]);\n", "")
content = content.replace("    await setJSON(SAVED_ACCOUNTS_KEY, null); // Clear all accounts\n", "")

# 6. Clean the exported context values
content = content.replace("      savedAccounts, switchAccount, addAccount, loginForAddAccount,\n", "")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully removed Multi-Account logic from AuthContext.")
