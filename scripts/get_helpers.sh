#!/bin/bash
echo "--- START OF ChatHelpers.tsx ---"
grep -n "VoiceNotePlayer" src/components/ChatHelpers.tsx
echo "--- CONTEXT AROUND VoiceNotePlayer (Lines 1 to 60) ---"
sed -n '1,60p' src/components/ChatHelpers.tsx
echo "--- END OF ChatHelpers.tsx ---"
