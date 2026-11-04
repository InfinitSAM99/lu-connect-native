file_path = 'src/screens/AccountsCenterScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update Imports
content = content.replace(
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';",
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';"
)
content = content.replace(
    "import TopBar from '../components/TopBar';",
    "import TopBar from '../components/TopBar';\nimport BottomSheet from '../components/BottomSheet';\nimport FastButton from '../components/FastButton';"
)

# 2. Update the useAuth hook
content = content.replace(
    "const { user, profile, savedAccounts, switchAccount, addAccount } = useAuth();",
    "const { user, profile, savedAccounts, switchAccount, loginForAddAccount } = useAuth();"
)

# 3. Add States for the login sheet
content = content.replace(
    "  const insets = useSafeAreaInsets();",
    """  const insets = useSafeAreaInsets();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addPass, setAddPass] = useState('');
  const [addErr, setAddErr] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const handleAddAccount = async () => {
    setAddErr('');
    if (!addEmail || !addPass) return setAddErr('Please fill in all fields.');
    setAddLoading(true);
    try {
      await loginForAddAccount(addEmail, addPass);
      setShowAddSheet(false);
      setAddEmail(''); setAddPass('');
    } catch (e: any) {
      setAddErr(e.message);
    } finally {
      setAddLoading(false);
    }
  };
"""
)

# 4. Change the "Add another account" button to open the sheet
content = content.replace(
    "onPress={addAccount}",
    "onPress={() => setShowAddSheet(true)}"
)

# 5. Inject the BottomSheet at the very end, right before the final </View>
sheet_code = """
      <BottomSheet open={showAddSheet} onClose={() => setShowAddSheet(false)} maxHeight="70vh">
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 }}>Add Account</Text>
          <Text style={{ fontSize: 14, color: '#6d7382', marginBottom: 24 }}>Log in to your second account. You can have a maximum of 2 accounts.</Text>

          {addErr ? <View style={{ backgroundColor: 'rgba(239,68,68,0.14)', padding: 12, borderRadius: 12, marginBottom: 16 }}><Text style={{ color: '#ef4444', fontSize: 13 }}>{addErr}</Text></View> : null}

          <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Email</Text>
          <TextInput
            style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, marginBottom: 16 }}
            value={addEmail}
            onChangeText={setAddEmail}
            placeholder="you@university.edu"
            placeholderTextColor="#6d7382"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={{ color: '#6d7382', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Password</Text>
          <TextInput
            style={{ backgroundColor: '#141414', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, marginBottom: 24 }}
            value={addPass}
            onChangeText={setAddPass}
            placeholder="Your password"
            placeholderTextColor="#6d7382"
            secureTextEntry
          />

          <FastButton style={{ backgroundColor: '#ef4444', borderRadius: 16, padding: 16, alignItems: 'center' }} onPress={handleAddAccount} disabled={addLoading}>
            {addLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Log In & Add Account</Text>}
          </FastButton>
        </View>
      </BottomSheet>
    </View>
  );
}"""

# Replace the last closing View
last_view_idx = content.rfind("    </View>\n  );\n}")
if last_view_idx != -1:
    content = content[:last_view_idx] + sheet_code + content[last_view_idx + len("    </View>\n  );\n}"):]
else:
    print("Error: Could not find the end of the component.")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully added the Add Account BottomSheet.")
