file_path = 'src/screens/AdminStudentsScreen.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Fix the filter crash (line 40)
old_filter = "  const filtered = students.filter((s) => {"
new_filter = "  const filtered = (students || []).filter((s) => {"

# 2. Fix the drawer crash (line 50)
old_drawer = "  const drawer = drawerId ? students.find((s) => s.id === drawerId) : null;"
new_drawer = "  const drawer = (drawerId && students) ? students.find((s) => s.id === drawerId) : null;"

if old_filter in content:
    content = content.replace(old_filter, new_filter)
else:
    print("Warning: Could not find filter block.")

if old_drawer in content:
    content = content.replace(old_drawer, new_drawer)
else:
    print("Warning: Could not find drawer block.")

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully patched AdminStudentsScreen crashes.")
