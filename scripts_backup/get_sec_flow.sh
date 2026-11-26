#!/bin/bash
echo "--- START OF src/screens/SecurityScreen.tsx ---"
cat src/screens/SecurityScreen.tsx
echo "--- END OF src/screens/SecurityScreen.tsx ---"
echo "--- START OF src/screens/SecurityQuestionsScreen.tsx ---"
sed -n '1,80p' src/screens/SecurityQuestionsScreen.tsx
echo "--- END OF src/screens/SecurityQuestionsScreen.tsx ---"
