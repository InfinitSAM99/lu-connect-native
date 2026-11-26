file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Find the Security screen registration (which we know works)
target = '<Stack.Screen name="Security" component={withLayout(SecurityScreen)} />'

if target in content:
    # Check if CheckAccountId is already there to avoid duplicates
    if 'name="CheckAccountId"' not in content.split(target)[1].split(')')[0]:
        content = content.replace(
            target, 
            target + '\n            <Stack.Screen name="CheckAccountId" component={CheckAccountIdScreen} />'
        )
        with open(file_path, 'w') as f:
            f.write(content)
        print("Successfully forced CheckAccountId into the logged-in stack.")
    else:
        print("CheckAccountId is already in the stack right after Security.")
else:
    print("Error: Could not find the Security screen registration.")
