file_path = 'src/screens/SecurityQuestionsScreen.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# We will cut the file at line 270 (index 269) to remove the broken tags
# Then append the correct closing tags.
new_lines = lines[:269]

correct_ending = """      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
"""

with open(file_path, 'w') as f:
    f.writelines(new_lines)
    f.write(correct_ending)
print("Successfully fixed the JSX ending in SecurityQuestionsScreen.")
