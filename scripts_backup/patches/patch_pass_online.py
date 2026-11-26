file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

old_map = """            <MessageBubble
              key={m.id}
              message={m}
              profile={profile}
              navigation={navigation}
              onDelete={deleteMessage}
              onReply={(msg: any) => setReplyingTo(msg)}
            />"""

new_map = """            <MessageBubble
              key={m.id}
              message={m}
              profile={profile}
              navigation={navigation}
              onDelete={deleteMessage}
              onReply={(msg: any) => setReplyingTo(msg)}
              otherOnline={otherOnline}
            />"""

if old_map in content:
    content = content.replace(old_map, new_map)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully passed otherOnline to MessageBubble.")
else:
    print("Error: Could not find the MessageBubble map to patch.")
