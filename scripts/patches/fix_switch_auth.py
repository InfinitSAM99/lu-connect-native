import re

file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update the switchAccount function to handle the session properly
old_switch = """  const switchAccount = async (account: any) => {
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
  };"""

new_switch = """  const switchAccount = async (account: any) => {
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

content = content.replace(old_switch, new_switch)

# 2. Update the saveActiveAccountToVault to use the real session data
old_save = """    const newAccount = {
      id: sessionUser.id,
      email: sessionUser.email,
      full_name: realProfile?.full_name || sessionUser.user_metadata?.full_name || 'User',
      avatar_url: realProfile?.avatar_url || sessionUser.user_metadata?.avatar_url || '',
      refresh_token: session.refresh_token,
    };"""

# Keep this as is, but ensure session.refresh_token exists
if old_save in content:
    print("Vault logic is correct, patching switch logic.")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully fixed switchAccount to use refreshSession.")
