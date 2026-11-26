file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the import for SecurityHubScreen (assuming it's in screens)
if "import SecurityHubScreen" not in content:
    content = content.replace(
        "import SettingsScreen from '../screens/SettingsScreen';",
        "import SettingsScreen from '../screens/SettingsScreen';\nimport SecurityHubScreen from '../screens/SecurityHubScreen';"
    )

# 2. Register the screen inside the main Student stack
# We will add it right after the Settings screen registration
if '<Stack.Screen name="SecurityHub"' not in content:
    content = content.replace(
        '<Stack.Screen name="Settings" component={withLayout(SettingsScreen)} />',
        '<Stack.Screen name="Settings" component={withLayout(SettingsScreen)} />\n            <Stack.Screen name="SecurityHub" component={withLayout(SecurityHubScreen)} />'
    )

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully registered SecurityHub in AppNavigator.")
