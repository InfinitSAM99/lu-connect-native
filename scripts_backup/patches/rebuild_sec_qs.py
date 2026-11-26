file_path = 'src/screens/SecurityQuestionsScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Find the exact index of the lock screen render
# We look for the start of the return statement
split_marker = "  if (lockScreenDate) {"

if split_marker in content:
    # Split the file into two parts: everything before the lock screen, and the lock screen code
    top_part, bottom_part = content.split(split_marker, 1)
    
    # We need to carefully rebuild the main return block from scratch
    # Find where the original return begins in the bottom part
    if "  return (" in bottom_part:
         _, rest_of_file = bottom_part.split("  return (", 1)
         
         # Now we construct the exact JSX for the main render
         new_main_render = """  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SECURITY QUESTIONS</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>RECOVER YOUR ACCOUNT</Text>
        <Text style={styles.subtitle}>
          Pick 3 questions and answer them. These answers only reveal your Account ID if you get locked out. You cannot change them for 5 months after saving.
        </Text>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Text style={styles.sectionHeader}>CREATE 3 CUSTOM SECURITY QUESTIONS</Text>
        
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.questionBlock}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.customInput}
                placeholder={`Type your question ${index + 1} here`}
                placeholderTextColor="#6d7382"
                value={customQuestions[index]}
                onChangeText={(text) => {
                  const newQ = [...customQuestions];
                  newQ[index] = text;
                  setCustomQuestions(newQ);
                }}
              />
              <TextInput
                style={styles.answerInput}
                placeholder="Type your answer"
                placeholderTextColor="#6d7382"
                value={customAnswers[index]}
                onChangeText={(text) => {
                  const newA = [...customAnswers];
                  newA[index] = text;
                  setCustomAnswers(newA);
                }}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={() => {}} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE AND LOCK FOR 5 MONTHS</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
"""
         
         # Re-assemble the file
         content = top_part + split_marker + new_main_render
         
         with open(file_path, 'w') as f:
            f.write(content)
         print("Successfully rebuilt the entire render block and fixed JSX.")
    else:
         print("Error: Could not find 'return (' in the bottom part.")
else:
    print("Error: Could not find 'if (lockScreenDate)' marker.")
