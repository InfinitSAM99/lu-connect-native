import re

file_path = 'src/screens/ConversationScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Update the insertMessage error handling to log the exact Supabase error
old_error = """    if (error) {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, messages: old.messages.filter((m: any) => m.id !== tempId) };
      });
      throw new Error(error.message);
    }"""

new_error = """    if (error) {
      console.error("SUPABASE INSERT ERROR:", error); // Added this line
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, messages: old.messages.filter((m: any) => m.id !== tempId) };
      });
      throw new Error(error.message);
    }"""

if old_error in content:
    content = content.replace(old_error, new_error)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully patched insertMessage to log errors.")
else:
    print("Error: Could not find the exact code block to patch. No changes made.")
