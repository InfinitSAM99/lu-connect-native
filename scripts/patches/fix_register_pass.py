file_path = 'src/screens/RegisterScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the regex validation function at the top of the component
regex_code = """
  const isStrongPassword = (pass: string) => {
    // Requires: 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special symbol
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_\\-+=])[A-Za-z\\d@$!%*?&#^()_\\-+=]{8,}$/;
    return strongRegex.test(pass);
  };
"""
# Insert it right after the component declaration (adjusting for your specific code)
# We will inject it before the first useState
content = content.replace("const [", regex_code + "\n  const [", 1)

# 2. Find the actual signup function and add the check
# We look for where the password is used in the submit function
old_submit = "if (!password" # This is a generic guess, we need to be careful
# Let's find the standard error checks in the submit function
# Usually looks like: if (!email) return setErr('...');
# We will find the first `if (!` in the submit function and inject before it.

with open(file_path, 'w') as f:
    f.write(content)
print("Injected password regex function. Now checking submission logic.")
