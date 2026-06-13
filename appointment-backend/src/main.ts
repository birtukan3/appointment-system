import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  console.log(`========================================`);
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📡 API base URL: http://localhost:${port}/api`);
  console.log(`========================================`);
}

bootstrap();
