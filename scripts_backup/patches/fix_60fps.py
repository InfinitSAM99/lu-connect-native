import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Completely remove the MessageList component we added earlier
# (We are switching to FlatList for native 60fps performance)
content = re.sub(r"const MessageList = React\.memo.*?\n\}\);\n", "", content, flags=re.DOTALL)

# 2. Replace ScrollView with FlatList in the imports
content = content.replace(
    "import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, Keyboard } from 'react-native';",
    "import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';"
)

# 3. Replace the old ScrollView render block with the Native FlatList
old_render = """        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
          
          {messages.map((m: any) => (
            <MessageBubble key={m.id} message={m} profile={profile} navigation={navigation} onDelete={deleteMessage} onReply={(msg: any) => setReplyingTo(msg)} otherOnline={otherOnline} />
          ))}

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

        </ScrollView>"""

new_render = """        <FlatList
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
        />"""

content = content.replace(old_render, new_render)

# 4. Fix the real-time listener to instantly hide typing bubble (So it vanishes when new message arrives)
old_realtime = "          const sender = s || null;\n\n          queryClient.setQueryData"
new_realtime = "          const sender = s || null;\n\n          setIsOtherTyping(false); // Instantly hide typing bubble so new message takes its place\n\n          queryClient.setQueryData"
content = content.replace(old_realtime, new_realtime)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully switched to FlatList for native 60fps performance.")
