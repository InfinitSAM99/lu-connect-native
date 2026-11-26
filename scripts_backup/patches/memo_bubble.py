file_path = 'src/components/MessageBubble.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Change standard export to a memoized export
content = content.replace(
    "import React, { useState, useRef } from 'react';",
    "import React, { useState, useRef, memo } from 'react';"
)
content = content.replace(
    "export default function MessageBubble(",
    "export default memo(function MessageBubble("
)
# Close the memo function at the end of the file
content = content.rstrip() + "\n});\n"

with open(file_path, 'w') as f:
    f.write(content)
print("Successfully memoized MessageBubble to prevent lag.")
