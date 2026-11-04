import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. The correct FlatList block
flatlist_code = """
        <FlatList
          ref={scrollRef}
          data={messages}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 14 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble message={item} profile={profile} navigation={navigation} onDelete={deleteMessage} onReply={(msg: any) => setReplyingTo(msg)} otherOnline={otherOnline} />
          )}
          ListFooterComponent={() => (
            isOtherTyping ? (
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
            ) : null
          )}
        />
"""

# 2. Find the gap and insert the FlatList
target_string = """        {errMsg ? <View style={{ backgroundColor: '#7f1d1d', margin: 10, padding: 10, borderRadius: 8 }}><Text style={{ color: '#fff', fontSize: 13 }}>{errMsg}</Text></View> : null}
"""

if target_string in content:
    content = content.replace(target_string, target_string + flatlist_code)
    
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully injected FlatList into the screen.")
else:
    print("Error: Could not find the insertion point.")
