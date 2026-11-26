file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Fix the broken import
content = content.replace(
    "import SecurityHubScreen from '../screens/SecurityHubScreen';",
    "import SecurityScreen from '../screens/SecurityScreen';"
)

# 2. Fix the screen registration
content = content.replace(
    '<Stack.Screen name="SecurityHub" component={withLayout(SecurityHubScreen)} />',
    '<Stack.Screen name="Security" component={withLayout(SecurityScreen)} />'
)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully fixed the Security screen import and route.")
