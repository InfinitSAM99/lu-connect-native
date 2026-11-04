file_path = 'src/navigation/AppNavigator.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect } from 'react';\nimport * as Application from 'expo-application';\nimport { supabase } from '../lib/supabase';\nimport ForceUpdateScreen from '../screens/ForceUpdateScreen';"
)

# 2. Add state and check logic inside AppNavigator
old_state = """  const [splashDone, setSplashDone] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);"""

new_state = """  const [splashDone, setSplashDone] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);
  
  // Update State
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ url: '', version: '' });

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
        if (data && data.apk_url) {
          const currentVersion = Application.nativeApplicationVersion || '1.0.0';
          // If the DB version is different from the app version, force update
          if (currentVersion !== data.latest_version) {
            setNeedsUpdate(true);
            setUpdateInfo({ url: data.apk_url, version: data.latest_version });
          }
        }
      } catch (e) {
        console.error('Version check failed:', e);
      }
    };
    checkVersion();
  }, []);"""

content = content.replace(old_state, new_state)

# 3. Add the routing check right before the return
old_return = """  // 3. Main Navigation
  return ("""

new_return = """  // FORCE UPDATE CHECK
  if (needsUpdate) {
    return <ForceUpdateScreen apkUrl={updateInfo.url} version={updateInfo.version} />;
  }

  // 3. Main Navigation
  return ("""

content = content.replace(old_return, new_return)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched AppNavigator for version checking.")
