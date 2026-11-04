import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add the Presence Channel Hook
presence_hook = """
  // LIVE PRESENCE (Instantly tracks if the other person is in the chat)
  useEffect(() => {
    if (!id || !myId || isGroup) return;
    const channel = supabase.channel(`presence-${id}`, {
      config: { presence: { key: myId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const isOtherHere = Object.keys(state).some(key => key !== myId);
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return { ...old, otherOnline: isOtherHere };
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, myId, isGroup, queryClient, queryKey]);
"""

# Insert it right after the conversation query
content = content.replace("  const loading = convQuery.isLoading;", "  const loading = convQuery.isLoading;\n" + presence_hook)

# 2. Ensure the tick logic uses the live presence
# (We already pass `otherOnline` to MessageBubble, so it will automatically use this new live data)

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully added Live Presence to ConversationScreen.tsx")
