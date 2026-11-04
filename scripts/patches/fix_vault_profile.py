file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

old_func = """  const saveActiveAccountToVault = async (sessionUser: any, session: any) => {
    if (!sessionUser || !session) return;
    const newAccount = {
      id: sessionUser.id,
      email: sessionUser.email,
      full_name: sessionUser.user_metadata?.full_name || 'User',
      avatar_url: sessionUser.user_metadata?.avatar_url || '',
      refresh_token: session.refresh_token,
    };
    
    setSavedAccounts((prev) => {
      const filtered = prev.filter(a => a.id !== newAccount.id);
      if (filtered.length >= 2) return prev; 
      const updated = [...filtered, newAccount];
      setJSON(SAVED_ACCOUNTS_KEY, updated);
      return updated;
    });
  };"""

new_func = """  const saveActiveAccountToVault = async (sessionUser: any, session: any) => {
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
    
    setSavedAccounts((prev) => {
      const filtered = prev.filter(a => a.id !== newAccount.id);
      if (filtered.length >= 2) return prev; 
      const updated = [...filtered, newAccount];
      setJSON(SAVED_ACCOUNTS_KEY, updated);
      return updated;
    });
  };"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully updated saveActiveAccountToVault to fetch real profiles.")
else:
    print("Error: Could not find the function to replace.")
