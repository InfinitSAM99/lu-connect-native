file_path = 'src/screens/SecurityScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add imports for useState, useEffect, supabase, and useAuth
content = content.replace(
    "import React from 'react';",
    "import React, { useState, useEffect } from 'react';"
)
content = content.replace(
    "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
    "import { useSafeAreaInsets } from 'react-native-safe-area-context';\nimport { supabase } from '../lib/supabase';\nimport { useAuth } from '../context/AuthContext';"
)

# 2. Inject state and logic into the component
logic_code = """
  const { profile } = useAuth();
  const [hasQuestions, setHasQuestions] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkRecovery = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('account_recovery')
        .select('questions')
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (data && data.questions && data.questions.length > 0) {
        setHasQuestions(true);
      } else {
        setHasQuestions(false);
      }
      setChecking(false);
    };
    checkRecovery();
  }, [profile?.id]);

  const handleSecureNavigation = (targetScreen: string) => {
    if (checking) return; // Prevent clicks while loading
    if (!hasQuestions) {
      // If no questions, intercept and send to setup
      navigation.navigate('SecurityQuestions');
    } else {
      navigation.navigate(targetScreen);
    }
  };
"""
content = content.replace("  const insets = useSafeAreaInsets();", "  const insets = useSafeAreaInsets();\n" + logic_code)

# 3. Update the buttons to use the new secure routing
content = content.replace(
    "onPress={() => navigation.navigate('CheckAccountId')}",
    "onPress={() => handleSecureNavigation('CheckAccountId')}"
)
content = content.replace(
    "onPress={() => navigation.navigate('ForgotPassword')}",
    "onPress={() => handleSecureNavigation('ForgotPassword')}"
)

# 4. (Optional) Update the subtitle to warn them if they haven't set it up
content = content.replace(
    "<Text style={styles.rowDesc}>Reveal your Account ID to help reset your password.</Text>",
    "<Text style={styles.rowDesc}>{hasQuestions ? 'Reveal your Account ID to help reset your password.' : 'Requires Security Questions to be set up first.'}</Text>"
)
content = content.replace(
    "<Text style={styles.rowDesc}>Change your password using your Account ID and Admission Number.</Text>",
    "<Text style={styles.rowDesc}>{hasQuestions ? 'Change your password using your Account ID and Admission Number.' : 'Requires Security Questions to be set up first.'}</Text>"
)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched SecurityScreen flow.")
