file_path = 'src/screens/SecurityQuestionsScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update imports to include KeyboardAvoidingView and Platform
content = content.replace(
    "View, Text, StyleSheet, ScrollView, TouchableOpacity,\n  TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager",
    "View, Text, StyleSheet, ScrollView, TouchableOpacity,\n  TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager, KeyboardAvoidingView"
)

# 2. Find the main return and wrap the container
# We look for the opening View tag that has styles.container
content = content.replace(
    "<View style={styles.container}>",
    "<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>",
    1 # Only replace the first instance
)

# 3. Find the final closing View and replace with KeyboardAvoidingView
# We use rstrip to remove trailing newlines/spaces to be safe
content = content.rstrip()
if content.endswith("</View>\n  );\n}"):
    content = content[:-len("</View>\n  );\n}")] + "</KeyboardAvoidingView>\n  );\n}"
elif content.endswith("</View>\n}"):
    content = content[:-len("</View>\n}")] + "</KeyboardAvoidingView>\n}"
else:
    # Fallback if it ends differently
    content = content.replace("    </View>\n  );\n}", "    </KeyboardAvoidingView>\n  );\n}")

# 4. Ensure the ScrollView has keyboardShouldPersistTaps
if 'keyboardShouldPersistTaps="handled"' not in content:
    content = content.replace(
        "<ScrollView ",
        '<ScrollView keyboardShouldPersistTaps="handled" '
    )

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully added KeyboardAvoidingView to SecurityQuestionsScreen.")
