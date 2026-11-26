import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Find the start of the broken typing block
start_marker = "{isOtherTyping && ("
start_idx = content.find(start_marker)

if start_idx != -1:
    # 2. Find the exact index where the broken block ends (right before messages.map)
    end_marker = "{messages.map((m: any) => ("
    end_idx = content.find(end_marker, start_idx)
    
    if end_idx != -1:
        # 3. Extract the broken part and the rest of the file
        broken_part = content[start_idx:end_idx]
        rest_of_file = content[end_idx:]
        
        # 4. The clean, correct typing block to replace it with (now empty at the top)
        content = content[:start_idx] + rest_of_file
        
        # 5. Now insert the correct typing block at the BOTTOM, right before </ScrollView>
        correct_typing = """          {isOtherTyping && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 12 }}>
              {other && (
                <Image source={{ uri: other.avatar_url || \`https://api.dicebear.com/7.x/initials/svg?seed=\${other.full_name}\` }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 4, backgroundColor: '#222' }} />
              )}
              <View style={{ backgroundColor: '#262626', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          )}
        </ScrollView>"""
        
        # Replace the closing ScrollView tag with the typing block + closing tag
        content = content.replace("        </ScrollView>", correct_typing)
        
        with open(file_path, 'w') as f:
            f.write(content)
        print("Successfully replaced the broken block and moved the typing bubble to the bottom.")
    else:
        print("Error: Could not find the end of the broken block.")
else:
    print("Error: Could not find the typing block. The file might already be broken.")
