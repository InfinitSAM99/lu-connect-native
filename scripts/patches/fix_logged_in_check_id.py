file_path = 'src/screens/CheckAccountIdScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add useAuth to get the logged-in user and profile
content = content.replace(
    "import { supabase } from '../lib/supabase';",
    "import { supabase } from '../lib/supabase';\nimport { useAuth } from '../context/AuthContext';"
)
content = content.replace(
    "  const insets = useSafeAreaInsets();",
    "  const insets = useSafeAreaInsets();\n  const { user, profile } = useAuth();"
)

# 2. Change the initial state to skip the email step if logged in
content = content.replace(
    "  const [questions, setQuestions] = useState<any[]>([]);",
    "  const [questions, setQuestions] = useState<any[]>([]);\n  const isLoggedIn = !!user;"
)

# 3. Add a useEffect to auto-fetch questions on mount if logged in
use_effect_code = """
  React.useEffect(() => {
    if (isLoggedIn && profile?.id) {
      const fetchMyQuestions = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('account_recovery')
            .select('questions')
            .eq('user_id', profile.id)
            .maybeSingle();
          
          if (error) throw error;
          if (data && data.questions) {
            // Map the custom questions to the UI format
            const formatted = data.questions.map((q: any) => ({ label: q.q || q }));
            setQuestions(formatted);
          }
        } catch (e: any) {
          setErrorMsg(e.message);
        } finally {
          setLoading(false);
        }
      };
      fetchMyQuestions();
    }
  }, [isLoggedIn, profile?.id]);
"""
content = content.replace("  // Step 1: Fetch the questions for this email", use_effect_code + "\n  // Step 1: Fetch the questions for this email")

# 4. Update the handleReveal logic for logged-in users (no password needed)
old_reveal = """  const handleReveal = async () => {
    if (!password || Object.keys(answers).length !== 3) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const ansArray = [answers[0], answers[1], answers[2]];

      // Call the new RPC that checks everything in the background
      const { data, error } = await supabase.rpc('reveal_account_id', {
        p_email: email.trim(),
        p_password: password,
        p_answers: ansArray
      });

      if (error) throw error;
      if (data) {
        setRevealedCode(data);
      } else {
        setErrorMsg('Incorrect password or answers.');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };"""

new_reveal = """  const handleReveal = async () => {
    if (Object.keys(answers).length !== 3) return;
    if (!isLoggedIn && !password) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const ansArray = [answers[0], answers[1], answers[2]];

      if (isLoggedIn) {
        // Logged in flow: Verify answers locally
        const { data: recovery } = await supabase
          .from('account_recovery')
          .select('questions')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (!recovery || !recovery.questions) throw new Error('No questions found.');

        const isCorrect = recovery.questions.every((q: any, i: number) => 
          (q.a || '').toLowerCase().trim() === ansArray[i].toLowerCase().trim()
        );

        if (isCorrect) {
          // Fetch the actual account ID (assuming it's in the profiles table or user metadata)
          const { data: prof } = await supabase.from('profiles').select('account_id').eq('id', profile.id).single();
          setRevealedCode(prof?.account_id || profile.account_id || 'NOT_FOUND');
        } else {
          setErrorMsg('One or more answers are incorrect.');
        }
      } else {
        // Logged out flow: Use RPC
        const { data, error } = await supabase.rpc('reveal_account_id', {
          p_email: email.trim(),
          p_password: password,
          p_answers: ansArray
        });

        if (error) throw error;
        if (data) setRevealedCode(data);
        else setErrorMsg('Incorrect password or answers.');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };"""

content = content.replace(old_reveal, new_reveal)

# 5. Update the UI so it hides the Email/Password fields for logged-in users
old_ui = """            {questions.length === 0 ? (
              <>
                <Text style={styles.subText}>Enter your email to find your security questions.</Text>

                <Text style={styles.sectionHeader}>EMAIL</Text>
                <TextInput style={styles.input} placeholder="you@university.edu" placeholderTextColor="#6d7382" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

                <TouchableOpacity style={[styles.primaryBtn, !email && { opacity: 0.5 }]} onPress={handleFetchQuestions} disabled={!email || loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>FIND ACCOUNT</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionHeader}>PASSWORD</Text>
                <TextInput style={styles.input} placeholder="Your password" placeholderTextColor="#6d7382" secureTextEntry value={password} onChangeText={setPassword} />

                <Text style={[styles.sectionHeader, { marginTop: 20 }]}>SECURITY QUESTIONS</Text>
                {questions.map((q, i) => (
                  <View key={i} style={{ marginBottom: 16 }}>
                    <Text style={styles.qLabel}>{q.label}</Text>
                    <TextInput style={styles.input} placeholder="Your answer" placeholderTextColor="#6d7382" value={answers[i] || ''} onChangeText={(t) => setAnswers(prev => ({...prev, [i]: t}))} autoCapitalize="none" />
                  </View>
                ))}

                <TouchableOpacity style={[styles.primaryBtn, (!password || Object.keys(answers).length !== 3) && { opacity: 0.5 }]} onPress={handleReveal} disabled={!password || Object.keys(answers).length !== 3 || loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>REVEAL ACCOUNT ID</Text>}
                </TouchableOpacity>
              </>
            )}"""

new_ui = """            {questions.length === 0 ? (
              // If logged in and questions aren't loaded yet
              isLoggedIn ? (
                <Text style={styles.subText}>Loading your security questions...</Text>
              ) : (
                // Logged out flow
                <>
                  <Text style={styles.subText}>Enter your email to find your security questions.</Text>
                  <Text style={styles.sectionHeader}>EMAIL</Text>
                  <TextInput style={styles.input} placeholder="you@university.edu" placeholderTextColor="#6d7382" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  <TouchableOpacity style={[styles.primaryBtn, !email && { opacity: 0.5 }]} onPress={handleFetchQuestions} disabled={!email || loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>FIND ACCOUNT</Text>}
                  </TouchableOpacity>
                </>
              )
            ) : (
              <>
                {/* Hide Password if Logged In */}
                {!isLoggedIn && (
                  <>
                    <Text style={styles.sectionHeader}>PASSWORD</Text>
                    <TextInput style={styles.input} placeholder="Your password" placeholderTextColor="#6d7382" secureTextEntry value={password} onChangeText={setPassword} />
                  </>
                )}

                <Text style={[styles.sectionHeader, { marginTop: 20 }]}>SECURITY QUESTIONS</Text>
                {questions.map((q, i) => (
                  <View key={i} style={{ marginBottom: 16 }}>
                    <Text style={styles.qLabel}>{q.label}</Text>
                    <TextInput style={styles.input} placeholder="Your answer" placeholderTextColor="#6d7382" value={answers[i] || ''} onChangeText={(t) => setAnswers(prev => ({...prev, [i]: t}))} autoCapitalize="none" />
                  </View>
                ))}

                <TouchableOpacity style={[styles.primaryBtn, (!isLoggedIn && !password) || Object.keys(answers).length !== 3 ? { opacity: 0.5 } : null]} onPress={handleReveal} disabled={(!isLoggedIn && !password) || Object.keys(answers).length !== 3 || loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>REVEAL ACCOUNT ID</Text>}
                </TouchableOpacity>
              </>
            )}"""

content = content.replace(old_ui, new_ui)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched CheckAccountIdScreen for logged-in users.")
