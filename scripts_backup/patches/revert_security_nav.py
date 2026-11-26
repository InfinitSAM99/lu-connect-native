file_path = 'src/screens/SecurityScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Remove the Alert import if we added it
content = content.replace(", Alert } from 'react-native';", " } from 'react-native';")

# 2. Revert handleSecureNavigation to just navigate directly
old_logic = """  const handleSecureNavigation = (targetScreen: string) => {
    if (checking) return; // Prevent clicks while loading
    
    if (!hasQuestions) {
      // Premium intercept: Explain why they need to set it up
      Alert.alert(
        'Recovery Not Set Up',
        'To view your Account ID or reset your password, you must first set up your 3 custom security questions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Questions Now', onPress: () => navigation.navigate('SecurityQuestions') }
        ]
      );
    } else {
      // If they have questions, go to the target screen
      navigation.navigate(targetScreen);
    }
  };"""

new_logic = """  const handleSecureNavigation = (targetScreen: string) => {
    // Just navigate directly, let the target screen handle the logic
    navigation.navigate(targetScreen);
  };"""

content = content.replace(old_logic, new_logic)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully reverted SecurityScreen to direct navigation.")
