file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# The old check that triggers the enforcer too early
old_check = "        ) : (!profile?.university_id || !profile?.avatar_url || !profile?.faculty || !profile?.course || !profile?.year_of_study) ? ("

# The new check: 
# 1. If there is no user, go to login.
# 2. If there IS a user, but profile.id is missing, show a loading spinner (it's fetching).
# 3. Only show Enforcer if profile.id exists AND fields are missing.
new_check = """        ) : user && !profile?.id ? (
          <Stack.Screen name="LoadingProfile">
            {() => (
              <View style={styles.center}>
                <ActivityIndicator color="#ef4444" size="large" />
              </View>
            )}
          </Stack.Screen>
        ) : (profile?.id && (!profile.university_id || !profile.avatar_url || !profile.faculty || !profile.course || !profile.year_of_study)) ? ("""

if old_check in content:
    content = content.replace(old_check, new_check)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully fixed the Enforcer routing race condition.")
else:
    print("Error: Could not find the exact check to replace. No changes made.")
