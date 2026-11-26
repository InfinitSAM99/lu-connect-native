file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Add a direct login function for the bottom sheet
new_func = """  const loginForAddAccount = async (email: string, password: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) throw new Error(res.error.message);
    return res;
  };

  const signOut = async () => {"""

content = content.replace("  const signOut = async () => {", new_func)

# Export it
content = content.replace(
    "savedAccounts, switchAccount, addAccount,",
    "savedAccounts, switchAccount, addAccount, loginForAddAccount,"
)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully added loginForAddAccount to AuthContext.")
