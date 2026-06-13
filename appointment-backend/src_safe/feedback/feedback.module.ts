import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackController } from './feedback.controller';
import { Appointment } from '../appointments/appointment.entity';
import { Testimonial } from '../testimonials/testimonial.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Testimonial])],
  controllers: [FeedbackController],
})
export class FeedbackModule {}