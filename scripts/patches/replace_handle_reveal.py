file_path = 'src/screens/CheckAccountIdScreen.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

# Find the start of the handleReveal function
for i, line in enumerate(lines):
    if "const handleReveal = async () => {" in line:
        start_idx = i
        break

if start_idx != -1:
    # Find the end of the function (the next empty line followed by 'const' or similar)
    brace_count = 0
    for i in range(start_idx, len(lines)):
        brace_count += lines[i].count('{')
        brace_count -= lines[i].count('}')
        
        if brace_count == 0 and i > start_idx:
            end_idx = i
            break
            
    if end_idx != -1:
        # Replace the block with the new RPC logic
        new_function = """  const handleReveal = async () => {
    if (Object.keys(answers).length !== 3) return;
    if (!isLoggedIn && !password) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const ansArray = [answers[0], answers[1], answers[2]];

      // Use the RPC for both logged-in and logged-out users for consistency
      const { data, error } = await supabase.rpc('reveal_account_id', {
        p_email: isLoggedIn ? profile.email : email.trim(),
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
  };
"""
        # Replace the lines
        lines[start_idx:end_idx+1] = [new_function]
        
        with open(file_path, 'w') as f:
            f.writelines(lines)
        print("Successfully replaced the handleReveal function using line numbers.")
    else:
        print("Error: Could not find the end of the function.")
else:
    print("Error: Could not find 'const handleReveal = async () => {'")
