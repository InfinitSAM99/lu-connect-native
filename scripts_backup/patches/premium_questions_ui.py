import re

file_path = 'src/screens/SecurityQuestionsScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Replace the hardcoded QUESTION_POOL with an empty initial state
content = content.replace(
    """const QUESTION_POOL = [
  { key: 'admission_number', label: 'What is your admission number?' },
  { key: 'dob', label: 'What is your date of birth? (YYYY-MM-DD)' },
  { key: 'primary_school', label: 'What primary school did you attend?' },
  { key: 'favourite_lecturer', label: 'Who is your favourite lecturer?' },
  { key: 'hostel_name', label: 'What is the name of your hostel or hall?' },
  { key: 'best_friend', label: "What is your best friend's full name?" },
];""", ""
)

# 2. Change the state to always hold 3 empty slots for custom questions
content = content.replace(
    "const [customQuestions, setCustomQuestions] = useState<string[]>(['', '', '']);",
    "const [customQuestions, setCustomQuestions] = useState<string[]>(['', '', '']);\n  const [customAnswers, setCustomAnswers] = useState<string[]>(['', '', '']);"
)

# 3. Replace the render logic for the questions
# We will find the return statement and replace the map of QUESTION_POOL
render_regex = re.compile(r'<Text style={styles.sectionHeader}>PICK 3 QUESTIONS.*?(?=<FastButton|<\/ScrollView>)', re.DOTALL)

new_ui = """<Text style={styles.sectionHeader}>CREATE 3 CUSTOM SECURITY QUESTIONS</Text>
        
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
                secureTextEntry={false}
              />
            </View>
          </View>
        ))}
        
        """

content = render_regex.sub(new_ui, content)

# 4. Add the premium styles
new_styles = """
  sectionHeader: { color: '#6d7382', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 24, marginBottom: 16 },
  questionBlock: { flexDirection: 'row', backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1f1f1f', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  numberBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  numberText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  customInput: { color: '#fff', fontSize: 15, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#1f1f1f', paddingVertical: 8, marginBottom: 8 },
  answerInput: { color: '#aab0bd', fontSize: 14, paddingVertical: 8 },
"""

content = content.replace("const styles = StyleSheet.create({", "const styles = StyleSheet.create({" + new_styles)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully applied premium layout to SecurityQuestionsScreen.")
