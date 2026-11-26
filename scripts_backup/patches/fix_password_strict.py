file_path = 'src/screens/LoginScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the strict validation inside handleRegister
old_register = """  const handleRegister = async () => {
    setRegErr(''); setRegMsg('');
    if (!reg.university) return setRegErr('Please select your university');
    setRegLoading(true);"""

new_register = """  const handleRegister = async () => {
    setRegErr(''); setRegMsg('');
    if (!reg.university) return setRegErr('Please select your university');
    
    // Strict Password Validation
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_\\-+=])[A-Za-z\\d@$!%*?&#^()_\\-+=]{8,}$/;
    if (!strongRegex.test(reg.password)) {
      return setRegErr('Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special symbol (e.g., @, #, $, !).');
    }

    setRegLoading(true);"""

content = content.replace(old_register, new_register)

# 2. Update the placeholder text in the UI
old_placeholder = 'placeholder="Min 6 characters"'
new_placeholder = 'placeholder="8+ chars, Uppercase, Number, Symbol"'

content = content.replace(old_placeholder, new_placeholder)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully added strict password validation to LoginScreen.")
