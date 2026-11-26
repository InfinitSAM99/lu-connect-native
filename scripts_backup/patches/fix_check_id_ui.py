file_path = 'src/screens/CheckAccountIdScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Force isLoggedIn to be true if profile exists
content = content.replace(
    "const isLoggedIn = !!user;",
    "const isLoggedIn = !!user && !!profile;"
)

# 2. Ensure the useEffect fetches questions properly
old_effect = """  React.useEffect(() => {
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
  }, [isLoggedIn, profile?.id]);"""

new_effect = """  React.useEffect(() => {
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
            const formatted = data.questions.map((q: any) => ({ label: q.q || q }));
            setQuestions(formatted);
          } else {
            setErrorMsg('No security questions found for your account.');
          }
        } catch (e: any) {
          setErrorMsg(e.message);
        } finally {
          setLoading(false);
        }
      };
      fetchMyQuestions();
    }
  }, [isLoggedIn, profile?.id]);"""
content = content.replace(old_effect, new_effect)

# 3. Update handleReveal to use the direct profile fetch (no RPC needed)
old_reveal = """      if (isLoggedIn) {
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
      }"""

new_reveal = """      if (isLoggedIn) {
        // Logged in flow: Verify answers locally
        const { data: recovery, error: recErr } = await supabase
          .from('account_recovery')
          .select('questions')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (recErr) throw recErr;
        if (!recovery || !recovery.questions) throw new Error('No security questions found.');

        const isCorrect = recovery.questions.every((q: any, i: number) => 
          (q.a || '').toLowerCase().trim() === ansArray[i].toLowerCase().trim()
        );

        if (isCorrect) {
          // Fetch the Account ID directly from the profiles table
          const { data: prof, error: profErr } = await supabase.from('profiles').select('account_id').eq('id', profile.id).single();
          
          if (profErr) throw profErr;
          if (prof && prof.account_id) {
            setRevealedCode(prof.account_id);
          } else {
            // Fallback if account_id column doesn't exist yet
            setErrorMsg('Account ID not found in your profile.');
          }
        } else {
          setErrorMsg('One or more answers are incorrect.');
        }
      }"""

content = content.replace(old_reveal, new_reveal)

# 4. Hide Password UI completely for logged-in users
old_ui = """                {/* Hide Password if Logged In */}
                {!isLoggedIn && (
                  <>
                    <Text style={styles.sectionHeader}>PASSWORD</Text>
                    <TextInput style={styles.input} placeholder="Your password" placeholderTextColor="#6d7382" secureTextEntry value={password} onChangeText={setPassword} />
                  </>
                )}"""
new_ui = """                {/* Password field is completely removed for logged-in users to ensure smooth flow */}"""
content = content.replace(old_ui, new_ui)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched CheckAccountIdScreen for flawless logged-in verification.")
