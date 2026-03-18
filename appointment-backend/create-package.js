const fs = require('fs');
const path = './package.json';

const packageJson = {
  "name": "appointment-backend",
  "version": "1.0.0",
  "description": "Professional Appointment System Backend",
  "main": "dist/main.js",
  "scripts": {
    "start:dev": "ts-node-dev --respawn --transpile-only src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.15",
    "@nestjs/core": "^10.4.15",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.15",
    "@nestjs/typeorm": "^10.0.2",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "dotenv": "^16.4.7",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "pg": "^8.13.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "^0.3.20"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^22.10.2",
    "@types/passport-jwt": "^4.0.1",
    "@types/passport-local": "^1.0.38",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.2"
  }
};

// Write file without BOM
fs.writeFileSync(path, JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ package.json created successfully without BOM!');

// Verify the file
const content = fs.readFileSync(path, 'utf8');
console.log('First character code:', content.charCodeAt(0));
if (content.charCodeAt(0) === 123) {
  console.log('✅ No BOM detected - first character is {');
} else {
  console.log('❌ BOM still present - first character code:', content.charCodeAt(0));
}
