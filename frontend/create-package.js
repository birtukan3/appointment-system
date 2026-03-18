const fs = require('fs');
const path = './package.json';

const packageJson = {
  "name": "appointment-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.35",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "axios": "^1.6.0",
    "react-hot-toast": "^2.4.0",
    "lucide-react": "^0.263.1",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0"
  }
};

// Write file without BOM (utf8 encoding in Node.js doesn't add BOM)
fs.writeFileSync(path, JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ package.json created successfully without BOM!');

// Verify the file
const content = fs.readFileSync(path, 'utf8');
console.log('First character code:', content.charCodeAt(0));
if (content.charCodeAt(0) === 123) { // 123 is '{'
  console.log('✅ No BOM detected - first character is {');
} else {
  console.log('❌ BOM still present - first character code:', content.charCodeAt(0));
}
