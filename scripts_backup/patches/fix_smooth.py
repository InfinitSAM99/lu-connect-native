import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Fix KeyboardAvoidingView Behavior
content = content.replace(
    "behavior={Platform.OS === 'ios' ? 'padding' : undefined}",
    "behavior={Platform.OS === 'ios' ? 'padding' : 'height'}"
)

# 2. Remove the manual keyboard height padding
content = content.replace(
    "<View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>",
    "<View style={{ flex: 1 }}>"
)

# 3. Remove the Keyboard JS listener entirely (Native 'height' handles it)
content = re.sub(
    r"  useEffect\(\(\) => \{\n    const s = Keyboard.addListener.*?\n  \}, \[\]\);",
    "",
    content,
    flags=re.DOTALL
)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully optimized keyboard layout.")
