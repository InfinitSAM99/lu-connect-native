import re

file_path = 'src/screens/AccountsCenterScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update imports if they haven't been updated
if 'Image' not in content:
    content = content.replace(
        "import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';",
        "import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';"
    )

# 2. Update useAuth if it hasn't been updated
if 'savedAccounts' not in content:
    content = content.replace(
        "const { profile } = useAuth();",
        "const { user, profile, savedAccounts, switchAccount, addAccount } = useAuth();"
    )

# 3. Inject the UI above the "Your account" section using Regex
new_ui = """        <SectionHeader>Accounts</SectionHeader>

        {/* ACTIVE ACCOUNT */}
        <View style={styles.flatRow}>
          <Image source={{ uri: profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name}` }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.flatRowTitle}>{profile.full_name || 'User'}</Text>
            <Text style={styles.flatRowSubtitle}>{user?.email}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#ef4444" />
        </View>

        {/* SAVED ACCOUNTS */}
        {savedAccounts?.filter((a: any) => a.id !== user?.id).map((account: any) => (
          <TouchableOpacity key={account.id} style={styles.flatRow} onPress={() => switchAccount(account)}>
            <Image source={{ uri: account.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${account.full_name}` }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.flatRowTitle}>{account.full_name}</Text>
              <Text style={styles.flatRowSubtitle}>{account.email}</Text>
            </View>
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Switch</Text>
          </TouchableOpacity>
        ))}

        {/* ADD ACCOUNT BUTTON (Max 2) */}
        {savedAccounts?.length < 2 && (
          <TouchableOpacity style={styles.flatRow} onPress={addAccount}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={22} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.flatRowTitle}>Add another account</Text>
              <Text style={styles.flatRowSubtitle}>You can add up to 2 accounts</Text>
            </View>
          </TouchableOpacity>
        )}

        <SectionHeader>Your account</SectionHeader>"""

# This regex looks for the line with "Your account" regardless of spaces around it
pattern = re.compile(r'\s*<SectionHeader>Your account</SectionHeader>')
if pattern.search(content):
    content = pattern.sub('\n' + new_ui, content, count=1)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully injected Accounts UI using Regex.")
else:
    print("Error: Could not find '<SectionHeader>Your account</SectionHeader>' in the file.")
