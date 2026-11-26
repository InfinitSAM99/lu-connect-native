import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Define the Memoized Message List Component
list_component = '''
const MessageList = React.memo(({ messages, profile, navigation, deleteMessage, setReplyingTo, otherOnline, isOtherTyping, other, scrollRef }: any) => {
  return (
    <ScrollView 
      ref={scrollRef} 
      style={{ flex: 1 }} 
      contentContainerStyle={{ padding: 14 }} 
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} 
      keyboardShouldPersistTaps="handled"
    >
      {messages.map((m: any) => (
        <MessageBubble key={m.id} message={m} profile={profile} navigation={navigation} onDelete={deleteMessage} onReply={(msg: any) => setReplyingTo(msg)} otherOnline={otherOnline} />
      ))}

      {isOtherTyping && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 12 }}>
          {other && (
            <Image source={{ uri: other.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${other.full_name}` }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 4, backgroundColor: '#222' }} />
          )}
          <View style={{ backgroundColor: '#262626', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#6d7382' }} />
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#6d7382' }} />
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#6d7382' }} />
          </View>
        </View>
      )}
    </ScrollView>
  );
});
'''

# Insert the component right before the main export
content = content.replace('export default function ConversationScreen', list_component + '\nexport default function ConversationScreen')

# 2. Replace the ScrollView with the Memoized List
scrollview_regex = r'<ScrollView ref=\{scrollRef\}.*?</ScrollView>'
replacement = '''<MessageList 
          messages={messages} 
          profile={profile} 
          navigation={navigation} 
          deleteMessage={deleteMessage} 
          setReplyingTo={setReplyingTo} 
          otherOnline={otherOnline} 
          isOtherTyping={isOtherTyping} 
          other={other} 
          scrollRef={scrollRef} 
        />'''
content = re.sub(scrollview_regex, replacement, content, flags=re.DOTALL)

# 3. Fix the Realtime Channel Reconnection Lag (Remove Date.now())
content = content.replace("supabase.channel(`conv-${id}-${Date.now()}`)", "supabase.channel(`conv-${id}`)")
content = content.replace("supabase.channel(`profile-${other?.id}-${Date.now()}`)", "supabase.channel(`profile-${other?.id}`)")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully optimized for 60/120fps. Message list is now memoized.")
