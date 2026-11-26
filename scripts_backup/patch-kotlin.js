const fs = require('fs');
const path = require('path');

const gradleFile = path.join(__dirname, '..', 'android', 'build.gradle');
if (!fs.existsSync(gradleFile)) {
  console.log('android/build.gradle not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(gradleFile, 'utf8');

// Force Kotlin 2.2.0
content = content.replace(/ext\.kotlinVersion\s*=\s*['"][^'"]+['"]/g, 'ext.kotlinVersion = "2.2.0"');
content = content.replace(/kotlinVersion\s*=\s*['"][^'"]+['"]/g, 'kotlinVersion = "2.2.0"');

// Force Gradle plugin version
content = content.replace(/org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^'"]+/g, 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.0');

fs.writeFileSync(gradleFile, content);
console.log('Patched android/build.gradle → Kotlin 2.2.0');
