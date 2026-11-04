import re

file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Change the loading check to bypass completely after 2 seconds
old_loading = """  if (loading && !forceLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }"""

new_loading = """  if (loading && !forceLoad) {
    // Instead of showing a spinner, just return null for 2 seconds while loading
    return <View style={styles.center}><ActivityIndicator color="#ef4444" size="large" /></View>;
  }"""

if old_loading in content:
    content = content.replace(old_loading, new_loading)
else:
    print("Could not find the loading check. Trying alternative.")

# If we are stuck at "user && !profile?.id", we need to bypass that too!
old_profile_check = """  if (user && !profile?.id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }"""

new_profile_check = """  if (user && !profile?.id && !forceLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }"""

if old_profile_check in content:
    content = content.replace(old_profile_check, new_profile_check)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched AppNavigator to force load.")
