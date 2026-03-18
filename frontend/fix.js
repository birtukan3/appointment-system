const fs = require('fs');
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
    "next": "14.2.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "react-hot-toast": "^2.4.0",
    "lucide-react": "^0.263.1",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0"
  }
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ package.json created successfully!');
