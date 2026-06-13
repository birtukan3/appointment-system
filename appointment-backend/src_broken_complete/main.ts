import { NestFactory } from '@nestjs/core';
import { Module, Get, Controller } from '@nestjs/common';

@Controller()
class AppController {
  @Get()
  getHello() {
    return { message: 'Appointment System API is working!', status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({
  controllers: [AppController],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = 3002;
  await app.listen(port);
  console.log(`✅ Backend is running on http://localhost:${port}`);
  console.log(`📡 Test API: http://localhost:${port}/`);
}
bootstrap();
