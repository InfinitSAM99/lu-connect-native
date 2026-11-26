file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

old_switch = """  const switchAccount = async (account: any) => {
    setLoading(true);
    try {
      // Supabase requires the current access token to be cleared before refreshing
      // We use the refresh token to get a brand new, valid session
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: account.refresh_token,
      });
      
      if (error) throw error;
      // onAuthStateChange will handle the profile reload automatically
    } catch (e: any) {
      console.error('Switch failed:', e.message);
      setLoading(false);
      // If the refresh token is completely invalid, we need to remove the account
      // and force them to log in again.
      if (e.message.includes('Invalid Refresh Token') || e.message.includes('missing')) {
         setSavedAccounts((prev) => {
            const updated = prev.filter(a => a.id !== account.id);
            setJSON(SAVED_ACCOUNTS_KEY, updated);
            return updated;
         });
      }
    }
  };"""

new_switch = """  const switchAccount = async (account: any) => {
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
         setSavedAccounts((prev) => {
            const updated = prev.filter(a => a.id !== account.id);
            setJSON(SAVED_ACCOUNTS_KEY, updated);
            return updated;
         });
      }
    }
  };"""

content = content.replace(old_switch, new_switch)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched switchAccount to handle dead tokens.")
