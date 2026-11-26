import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

old_insert = """    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.map((m: any) => m.id === tempId ? { ...inserted, sender: profile, _optimistic: false } : m).filter((m: any) => m.id !== inserted.id)
      };
    });
  };"""

new_insert = """    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.map((m: any) => 
          m.id === tempId ? { ...inserted, sender: profile, _optimistic: false } : m
        )
      };
    });
  };"""

if old_insert in content:
    content = content.replace(old_insert, new_insert)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully fixed insertMessage state management.")
else:
    print("Error: Could not find the exact insertMessage block to fix. No changes made.")
