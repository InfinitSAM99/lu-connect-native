file_path = 'src/screens/CheckAccountIdScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Find the handleReveal function and update it to use the RPC
old_reveal = """      if (isLoggedIn) {
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
      } else {"""

new_reveal = """      if (isLoggedIn) {
        // Use the RPC for logged-in users too, it's safer and handles the logic
        const { data, error } = await supabase.rpc('reveal_account_id', {
          p_email: profile.email || '', 
          p_password: '', // Not needed for logged-in users
          p_answers: ansArray
        });

        if (error) throw error;
        if (data) {
          setRevealedCode(data);
        } else {
          setErrorMsg('Incorrect answers. Please try again.');
        }
      } else {"""

if old_reveal in content:
    content = content.replace(old_reveal, new_reveal)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully updated CheckAccountIdScreen to use the RPC.")
else:
    print("Error: Could not find the handleReveal block to replace.")
