import re

file_path = 'src/screens/AccountsCenterScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Revert imports
content = content.replace(
    "import React, { useState } from 'react';",
    "import React from 'react';"
)
content = content.replace(
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';",
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';"
)
content = content.replace(
    "import BottomSheet from '../components/BottomSheet';\nimport FastButton from '../components/FastButton';\n",
    ""
)

# 2. Revert useAuth hook
content = content.replace(
    "const { user, profile, savedAccounts, switchAccount, loginForAddAccount } = useAuth();",
    "const { profile } = useAuth();"
)

# 3. Remove the extra states and handleAddAccount function
content = re.sub(r'  const \[showAddSheet.*?\n  \};\n', '', content, flags=re.DOTALL)

# 4. Remove the UI block we added (everything from <SectionHeader>Accounts to <SectionHeader>Your account)
ui_regex = re.compile(r'\s*<SectionHeader>Accounts</SectionHeader>.*?(?=<SectionHeader>Your account</SectionHeader>)', re.DOTALL)
content = ui_regex.sub('\n        ', content)

# 5. Remove the BottomSheet component at the bottom
sheet_regex = re.compile(r'\s*<BottomSheet open=\{showAddSheet\}.*?</BottomSheet>', re.DOTALL)
content = sheet_regex.sub('', content)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully cleaned AccountsCenterScreen UI.")
