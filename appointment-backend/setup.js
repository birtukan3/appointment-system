const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
const dirs = [
  'src/users/dto',
  'src/auth',
  'src/appointments/dto'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// package.json
const packageJson = {
  "name": "appointment-backend",
  "version": "1.0.0",
  "description": "Appointment System Backend",
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
    "class-validator": "^0.14.1",
    "dotenv": "^16.4.7",
    "pg": "^8.13.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "^0.3.20",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "exceljs": "^4.4.0"
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

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ package.json created');

// tsconfig.json
const tsconfig = {
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
};

fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2), 'utf8');
console.log('✅ tsconfig.json created');

// .env
const env = `JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=1234
DB_NAME=appointment_db
`;

fs.writeFileSync('.env', env, 'utf8');
console.log('✅ .env created');

// main.ts
const mainTs = `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  await app.listen(5000);
  console.log('✅ Backend running on http://localhost:5000');
  console.log('✅ Available endpoints:');
  console.log('   POST /auth/register');
  console.log('   POST /auth/login');
  console.log('   GET /users/profile');
  console.log('   GET /appointments');
}
bootstrap();`;

fs.writeFileSync('src/main.ts', mainTs, 'utf8');
console.log('✅ src/main.ts created');

// app.module.ts
const appModule = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { User } from './users/user.entity';
import { Appointment } from './appointments/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234',
      database: 'appointment_db',
      entities: [User, Appointment],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    AppointmentsModule,
  ],
})
export class AppModule {}`;

fs.writeFileSync('src/app.module.ts', appModule, 'utf8');
console.log('✅ src/app.module.ts created');

console.log('\n🎉 All files created successfully!');
console.log('Run: npm install && npm run start:dev');
