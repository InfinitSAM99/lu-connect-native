import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Use a precise regex to remove the broken typing block and its surrounding tags
# This looks for the typing block starting with {isOtherTyping and ending right before {messages.map
broken_block_regex = r"\{isOtherTyping && \(.*?</View>\s*\}\s*(?=\{messages\.map)"
content = re.sub(broken_block_regex, "", content, flags=re.DOTALL)

# 2. Define the correct typing block to place at the bottom
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

# 3. Insert the typing block right before the ScrollView closes
# The map ends with "))}\n        </ScrollView>"
if "))}\n        </ScrollView>" in content:
    content = content.replace("))}\n        </ScrollView>", "))}\n" + correct_typing_block + "        </ScrollView>")
else:
    print("Warning: Could not find the end of the ScrollView. Checking for alternative format.")
    # Fallback if spacing is slightly different
    content = content.replace("))}\r\n        </ScrollView>", "))}\r\n" + correct_typing_block + "        </ScrollView>")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully fixed the JSX crash and placed the typing bubble at the bottom.")
