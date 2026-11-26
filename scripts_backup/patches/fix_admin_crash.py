file_path = 'src/screens/AdminStudentsScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Fix the crash on line 50 by safely checking if students exists
old_line = "  const drawer = drawerId ? students.find(s => s.id === drawerId) : null;"
new_line = "  const drawer = (drawerId && students) ? students.find(s => s.id === drawerId) : null;"

if old_line in content:
    content = content.replace(old_line, new_line)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Successfully fixed AdminStudentsScreen crash.")
else:
    print("Error: Could not find the exact line to fix. Maybe spacing is different.")
