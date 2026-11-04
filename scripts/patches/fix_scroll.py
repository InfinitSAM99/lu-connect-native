import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Remove the broken typing block from wherever it got dumped inside the map
# This regex looks for the typing block and removes it.
content = re.sub(r"\{isOtherTyping && \(\s*<View style=\{\{ flexDirection: 'row'.*?</View>\s*</View>\s*\)\}\n?", "", content, flags=re.DOTALL)

# 2. Find the end of the messages.map loop and insert the typing block correctly
correct_typing_block = """
          {isOtherTyping && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 12 }}>
              {other && (
                <Image source={{ uri: other.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${other.full_name}` }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 4, backgroundColor: '#222' }} />
              )}
              <View style={{ backgroundColor: '#262626', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          )}
"""

# Find the closing of the map:  ))}
# We will inject the typing block right after it.
content = content.replace("          ))}\n        </ScrollView>", "          ))}\n" + correct_typing_block + "        </ScrollView>")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully fixed the ScrollView closing tag and moved the typing bubble.")
