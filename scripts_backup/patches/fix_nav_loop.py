file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Remove the broken Stack.Screen spinner we added previously
broken_spinner_block = """        ) : user && !profile?.id ? (
          <Stack.Screen name="LoadingProfile">
            {() => (
              <View style={styles.center}>
                <ActivityIndicator color="#ef4444" size="large" />
              </View>
            )}
          </Stack.Screen>
        ) : (profile?.id && (!profile.university_id || !profile.avatar_url || !profile.faculty || !profile.course || !profile.year_of_study)) ? ("""

fixed_check_block = """        ) : (profile?.id && (!profile.university_id || !profile.avatar_url || !profile.faculty || !profile.course || !profile.year_of_study)) ? ("""

content = content.replace(broken_spinner_block, fixed_check_block)

# 2. Add the check OUTSIDE the NavigationContainer, right below the main loading check
old_loading_check = """  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }"""

new_loading_check = """  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }

  // Catch the state where the user is logged in but the profile hasn't downloaded from Supabase yet
  if (user && !profile?.id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }"""

content = content.replace(old_loading_check, new_loading_check)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully fixed the infinite loading loop in AppNavigator.")
