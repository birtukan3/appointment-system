import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { User } from './users/user.entity';
import { Appointment } from './appointments/appointment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', 'SmartOffice@2026!'),
        database: configService.get('DB_NAME', 'appointment_db'),
        entities: [User, Appointment],
        synchronize: true,  // Set to true to auto-create tables
        logging: true,  // Enable logging to see what's happening
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    AppointmentsModule,
  ],
})
export class AppModule {}