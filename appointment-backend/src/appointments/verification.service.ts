import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, BookingStatus } from './appointment.entity';
import * as QRCode from 'qrcode';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  generateVerificationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const groups = 3;
    const groupLength = 3;
    
    const generateGroup = () => {
      let group = '';
      for (let i = 0; i < groupLength; i++) {
        group += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return group;
    };
    
    return `${generateGroup()}-${generateGroup()}-${generateGroup()}`;
  }

  async assignVerificationCode(appointmentId: number): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    if (appointment.status !== BookingStatus.APPROVED) {
      throw new Error('Verification codes only for approved appointments');
    }
    
    let verificationCode = this.generateVerificationCode();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const existing = await this.appointmentRepo.findOne({ where: { verificationCode } });
      if (!existing) isUnique = true;
      else verificationCode = this.generateVerificationCode();
      attempts++;
    }
    
    appointment.verificationCode = verificationCode;
    return this.appointmentRepo.save(appointment);
  }

  async verifyBooking(verificationCode: string): Promise<{ valid: boolean; message: string; appointment?: Appointment }> {
    const appointment = await this.appointmentRepo.findOne({ where: { verificationCode } });
    if (!appointment) return { valid: false, message: 'Invalid verification code' };
    
    if (appointment.status !== BookingStatus.APPROVED) {
      return { valid: false, message: `Cannot verify. Status: ${appointment.status}` };
    }
    
    const appointmentTime = new Date(appointment.datetime);
    const now = new Date();
    const diffMinutes = (now.getTime() - appointmentTime.getTime()) / 60000;
    
    if (diffMinutes < -30) return { valid: false, message: 'Too early for check-in' };
    if (diffMinutes > 30) return { valid: false, message: 'Check-in window expired' };
    
    return { valid: true, message: 'Booking verified', appointment };
  }
}