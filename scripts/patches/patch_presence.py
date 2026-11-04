import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add Presence Heartbeat
presence_code = """
  // PRESENCE HEARTBEAT (Updates last_seen so others see you online)
  useEffect(() => {
    if (!myId) return;
    const updatePresence = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', myId).then();
    };
    updatePresence(); // Run immediately
    const interval = setInterval(updatePresence, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [myId]);
"""
content = content.replace("  useEffect(() => {\n    const s = Keyboard.addListener", presence_code + "\n  useEffect(() => {\n    const s = Keyboard.addListener")

# 2. Fix the Typing Bubble Style
old_typing = """          {isOtherTyping && (
            <View style={styles.typingWrap}>
              <View style={styles.typingBubble}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          )}"""
new_typing = """          {isOtherTyping && (
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
          )}"""
content = content.replace(old_typing, new_typing)
content = content.replace("  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6d7382' },", "  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#6d7382' },")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched ConversationScreen.tsx")
