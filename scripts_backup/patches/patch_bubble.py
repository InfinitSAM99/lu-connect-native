import re

file_path = 'src/components/MessageBubble.tsx'
with open(file_path, 'r') as f:
    content = f.read()

new_bubble_component = """export default function MessageBubble({ message: m, profile, onReply, onDelete, navigation }: any) {
  const isMine = m._optimistic === true || (m.sender_id && m.sender_id === profile?.id);
  const [menuOpen, setMenuOpen] = useState(false);

  const pan = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => {
      const moveX = g.dx;
      const dampened = moveX > 0 ? Math.min(moveX, 60) : Math.max(moveX, -60);
      pan.setValue(dampened);
      replyIconOpacity.setValue(Math.min(Math.abs(moveX) / 50, 1));
    },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 40) onReply?.(m);
      Animated.parallel([
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.timing(replyIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start();
    },
  })).current;

  const deleted = m.is_deleted;
  const isImage = !deleted && m.attachment_type === 'image';
  const isAudio = !deleted && m.attachment_type === 'audio';
  const hasReply = m.parent && !deleted;

  const bubbleColor = isMine ? '#ef4444' : '#262626';
  const deletedBubbleColor = '#1f1f1f';
  const textColor = '#fff';

  // Format time outside the render
  const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={{ flexDirection: 'row', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 16, paddingHorizontal: 12, alignItems: 'flex-end' }}>
      
      {/* Swipe Reply Icon */}
      <Animated.View style={{ position: 'absolute', [isMine ? 'right' : 'left']: 24, bottom: 16, opacity: replyIconOpacity, zIndex: -1 }}>
        <Ionicons name="arrow-undo" size={22} color="#ef4444" />
      </Animated.View>

      {/* Avatar for other person (Instagram style) */}
      {!isMine && (
        <Image 
          source={{ uri: m.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.sender?.full_name}` }} 
          style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 4, backgroundColor: '#222' }} 
        />
      )}

      <Animated.View style={{ maxWidth: '78%', alignItems: isMine ? 'flex-end' : 'flex-start', transform: [{ translateX: pan }] }} {...panResponder.panHandlers}>
        
        {hasReply && (
          <View style={{
            backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : '#1f1f1f',
            borderRadius: 16,
            padding: 10,
            marginBottom: 4,
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            maxWidth: '100%',
          }}>
            <Text style={{ color: isMine ? '#fff' : '#aab0bd', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>
              {m.parent.sender?.full_name || 'User'}
            </Text>
            <Text style={{ color: isMine ? 'rgba(255,255,255,0.8)' : '#6d7382', fontSize: 13 }} numberOfLines={1}>
              {m.parent.is_deleted ? 'Deleted message' : m.parent.content || 'Media'}
            </Text>
          </View>
        )}

        <TouchableOpacity activeOpacity={0.9} onLongPress={() => !deleted && setMenuOpen(true)} delayLongPress={400}>
          <View style={{
            backgroundColor: deleted ? deletedBubbleColor : (isImage ? 'transparent' : bubbleColor),
            borderRadius: 22,
            paddingHorizontal: isImage ? 0 : 12,
            paddingVertical: isImage ? 0 : (isAudio ? 6 : 10), // Tighter padding for audio
            borderBottomRightRadius: isMine ? 4 : 22, // Sharp corner for mine
            borderBottomLeftRadius: !isMine ? 4 : 22, // Sharp corner for theirs
          }}>
            {deleted ? (
              <Text style={{ color: '#6d7382', fontSize: 14, fontStyle: 'italic', padding: 4 }}>Message deleted</Text>
            ) : isImage ? (
              <Image source={{ uri: m.attachment_url }} style={{ width: 220, height: 220, borderRadius: 18 }} resizeMode="cover" />
            ) : isAudio ? (
              <VoiceNotePlayer url={m.attachment_url} isMine={isMine} />
            ) : (
              renderMessageText(m.content, textColor)
            )}

            {/* Time and Ticks for non-audio messages */}
            {!deleted && !isAudio && (
              <Text style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#aab0bd', fontSize: 10, alignSelf: 'flex-end', marginTop: 4 }}>
                {timeStr}
                {isMine && !m._optimistic && <Text> {m.read_at ? '✓✓' : '✓'}</Text>}
              </Text>
            )}
          </View>

          {/* Time and Ticks for AUDIO messages (placed outside the pill) */}
          {!deleted && isAudio && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: isMine ? 'flex-end' : 'flex-start', paddingHorizontal: 4 }}>
              <Text style={{ color: isMine ? 'rgba(255,255,255,0.7)' : '#aab0bd', fontSize: 10 }}>
                {timeStr}
                {isMine && !m._optimistic && <Text> {m.read_at ? '✓✓' : '✓'}</Text>}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* LONG PRESS MENU */}
      {menuOpen && (
        <View style={{
          position: 'absolute', top: -50, right: isMine ? 20 : undefined, left: isMine ? undefined : 40,
          backgroundColor: '#262626', borderRadius: 24, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8,
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10, zIndex: 10
        }}>
          <TouchableOpacity onPress={() => { setMenuOpen(false); onReply?.(m); }} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
            <Ionicons name="arrow-undo" size={20} color="#fff" />
          </TouchableOpacity>
          {!deleted && m.content && (
            <TouchableOpacity onPress={() => { setMenuOpen(false); Clipboard.setStringAsync(m.content); }} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
              <Ionicons name="copy-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          {isMine && !deleted && (
            <TouchableOpacity onPress={() => { setMenuOpen(false); onDelete?.(m); }} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}"""

pattern = re.compile(r"export default function MessageBubble\(\{ message: m, profile, onReply, onDelete, navigation \}: any\) \{.*?^\}", re.MULTILINE | re.DOTALL)
content_new = pattern.sub(new_bubble_component, content)

if content_new != content:
    with open(file_path, 'w') as f:
        f.write(content_new)
    print("Successfully updated MessageBubble.tsx")
else:
    print("Error: Could not find MessageBubble to replace.")
