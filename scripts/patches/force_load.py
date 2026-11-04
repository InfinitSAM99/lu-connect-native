file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add a safety timeout state
old_import = "import React, { useState } from 'react';"
new_import = "import React, { useState, useEffect } from 'react';"
content = content.replace(old_import, new_import)

old_nav = """export default function AppNavigator() {
  const { user, profile, loading, kickoutReason, deviceBanned } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }"""

new_nav = """export default function AppNavigator() {
  const { user, profile, loading, kickoutReason, deviceBanned } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);

  // Safety timeout: If loading takes more than 2.5 seconds, force it to open
  useEffect(() => {
    const timer = setTimeout(() => setForceLoad(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  if (loading && !forceLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }"""

if old_nav in content:
    content = content.replace(old_nav, new_nav)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully added force-load timeout to AppNavigator.")
else:
    print("Error: Could not find the AppNavigator block.")
