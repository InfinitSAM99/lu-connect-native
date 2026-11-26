file_path = 'src/context/AuthContext.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# The new function code (lines 56 to 74)
new_func_lines = [
    "  const saveActiveAccountToVault = async (sessionUser: any, session: any) => {\n",
    "    if (!sessionUser || !session) return;\n",
    "    \n",
    "    // Fetch the real profile from the DB so we get the actual avatar and name\n",
    "    const { data: realProfile } = await supabase\n",
    "      .from('profiles')\n",
    "      .select('full_name, avatar_url')\n",
    "      .eq('id', sessionUser.id)\n",
    "      .maybeSingle();\n",
    "\n",
    "    const newAccount = {\n",
    "      id: sessionUser.id,\n",
    "      email: sessionUser.email,\n",
    "      full_name: realProfile?.full_name || sessionUser.user_metadata?.full_name || 'User',\n",
    "      avatar_url: realProfile?.avatar_url || sessionUser.user_metadata?.avatar_url || '',\n",
    "      refresh_token: session.refresh_token,\n",
    "    };\n",
    "    \n",
    "    setSavedAccounts((prev) => {\n",
    "      const filtered = prev.filter(a => a.id !== newAccount.id);\n",
    "      if (filtered.length >= 2) return prev; \n",
    "      const updated = [...filtered, newAccount];\n",
    "      setJSON(SAVED_ACCOUNTS_KEY, updated);\n",
    "      return updated;\n",
    "    });\n",
    "  };\n"
]

# Replace lines 56 to 74 (index 55 to 73)
lines[55:74] = new_func_lines

with open(file_path, 'w') as f:
    f.writelines(lines)
print("Successfully replaced lines 56-74 with the real profile fetch logic.")
