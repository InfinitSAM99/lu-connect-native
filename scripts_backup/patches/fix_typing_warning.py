import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Update handleTyping to check connection status
old_handle = """  const handleTyping = (val: string) => {
    setText(val);
    if (!typingChannelRef.current) return;
    
    if (val.trim().length > 0) {
      typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: myId, is_typing: true } });"""

new_handle = """  const handleTyping = (val: string) => {
    setText(val);
    if (!typingChannelRef.current) return;
    
    // Only send if the websocket is actually connected to prevent REST fallback warnings
    const isConnected = typingChannelRef.current.state === 'joined';
    
    if (val.trim().length > 0 && isConnected) {
      typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: myId, is_typing: true } });"""

if old_handle in content:
    content = content.replace(old_handle, new_handle)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully updated handleTyping to prevent REST fallback warnings.")
else:
    print("Error: Could not find handleTyping block.")
