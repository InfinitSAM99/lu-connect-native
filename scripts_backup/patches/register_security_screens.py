file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the imports for all the security-related screens
imports_to_add = """
import SetPatternScreen from '../screens/SetPatternScreen';
import SecurityQuestionsScreen from '../screens/SecurityQuestionsScreen';
import AccountIdRecoveryScreen from '../screens/AccountIdRecoveryScreen';
import SessionLockScreen from '../screens/SessionLockScreen';
"""
# Insert them right after the SecurityScreen import
content = content.replace(
    "import SecurityScreen from '../screens/SecurityScreen';",
    "import SecurityScreen from '../screens/SecurityScreen';" + imports_to_add
)

# 2. Register all the screens in the main stack
# We will add them right next to the Security screen registration
screens_to_add = """
            <Stack.Screen name="SetPattern" component={SetPatternScreen} />
            <Stack.Screen name="SecurityQuestions" component={SecurityQuestionsScreen} />
            <Stack.Screen name="AccountIdRecovery" component={AccountIdRecoveryScreen} />
            <Stack.Screen name="SessionLock" component={SessionLockScreen} />
"""
content = content.replace(
    '<Stack.Screen name="Security" component={withLayout(SecurityScreen)} />',
    '<Stack.Screen name="Security" component={withLayout(SecurityScreen)} />' + screens_to_add
)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully registered all Security screens in AppNavigator.")
