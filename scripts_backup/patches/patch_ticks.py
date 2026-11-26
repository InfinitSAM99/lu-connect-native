import re

file_path = 'src/components/MessageBubble.tsx'
with open(file_path, 'r') as f:
    content = f.read()

content = content.replace(
    "export default function MessageBubble({ message: m, profile, onReply, onDelete, navigation }: any) {",
    "export default function MessageBubble({ message: m, profile, onReply, onDelete, navigation, otherOnline }: any) {"
)

old_tick = """                {timeStr}
                {isMine && !m._optimistic && <Text> {m.read_at ? '✓✓' : '✓'}</Text>}"""
new_tick = """                {timeStr}
                {isMine && !m._optimistic && (
                  <Text>
                    {m.read_at ? (
                      <Text style={{ color: '#3b82f6' }}> ✓✓</Text>
                    ) : otherOnline ? (
                      <Text style={{ color: 'rgba(255,255,255,0.5)' }}> ✓✓</Text>
                    ) : (
                      <Text style={{ color: 'rgba(255,255,255,0.5)' }}> ✓</Text>
                    )}
                  </Text>
                )}"""
content = content.replace(old_tick, new_tick)

old_audio_tick = """                {timeStr}
                {isMine && !m._optimistic && <Text> {m.read_at ? '✓✓' : '✓'}</Text>}"""
new_audio_tick = """                {timeStr}
                {isMine && !m._optimistic && (
                  <Text>
                    {m.read_at ? (
                      <Text style={{ color: '#3b82f6' }}> ✓✓</Text>
                    ) : otherOnline ? (
                      <Text style={{ color: 'rgba(255,255,255,0.5)' }}> ✓✓</Text>
                    ) : (
                      <Text style={{ color: 'rgba(255,255,255,0.5)' }}> ✓</Text>
                    )}
                  </Text>
                )}"""
content = content.replace(old_audio_tick, new_audio_tick)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched MessageBubble.tsx")
