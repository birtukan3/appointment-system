import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestimonialsController } from './testimonials.controller';
import { Testimonial } from './testimonial.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Testimonial]),
    AuditModule,
  ],
  controllers: [TestimonialsController],
  exports: [TypeOrmModule],
})
export class TestimonialsModule {}