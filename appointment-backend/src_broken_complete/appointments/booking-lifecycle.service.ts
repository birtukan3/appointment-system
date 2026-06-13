import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, In, Not, IsNull } from 'typeorm';
import { Appointment, BookingStatus } from './appointment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { AuditService } from '../audit/audit.service';
import { AuditActionType, AuditStatus } from '../audit/audit.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format, differenceInHours, isBefore, subDays } from 'date-fns';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class BookingLifecycleService {
  private readonly logger = new Logger(BookingLifecycleService.name);
  private readonly CODE_EXPIRY_DAYS = 7;
  private readonly ARCHIVE_DAYS = 30;

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  generateVerificationCode(): string {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `APT-${year}-${random}`;
  }

  generateApprovalCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(crypto.randomBytes(1)[0] % chars.length));
    }
    return code;
  }

  async generateQRCode(verificationCode: string): Promise<string> {
    try {
      const qrData = JSON.stringify({
        code: verificationCode,
        type: 'appointment_verification',
        timestamp: Date.now(),
        expiresAt: new Date(Date.now() + this.CODE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      });
      return await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`QR generation failed: ${errorMessage}`);
      return null;
    }
  }

  generateBookingCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `BK-${timestamp}-${random}`;
  }

  async validateApprovalCode(code: string): Promise<{ 
    valid: boolean; 
    appointment?: Appointment; 
    message: string;
    isExpired?: boolean;
  }> {
    const appointment = await this.appointmentRepo.findOne({
      where: { approvalCode: code.toUpperCase() }
    });

    if (!appointment) {
      return { valid: false, message: 'Invalid approval code' };
    }

    if (appointment.status !== BookingStatus.PENDING) {
      return { 
        valid: false, 
        message: `Appointment is already ${appointment.status}`,
        appointment 
      };
    }

    const hoursSinceCreation = differenceInHours(new Date(), appointment.createdAt);
    if (hoursSinceCreation > this.CODE_EXPIRY_DAYS * 24) {
      appointment.status = BookingStatus.EXPIRED;
      appointment.isExpired = true;
      appointment.expiredAt = new Date();
      await this.appointmentRepo.save(appointment);
      return { 
        valid: false, 
        message: 'Approval code has expired (7 days limit)',
        isExpired: true 
      };
    }

    if (isBefore(appointment.datetime, new Date())) {
      appointment.status = BookingStatus.EXPIRED;
      appointment.isExpired = true;
      appointment.expiredAt = new Date();
      await this.appointmentRepo.save(appointment);
      return { 
        valid: false, 
        message: 'Appointment time has already passed',
        isExpired: true 
      };
    }

    return { valid: true, appointment, message: 'Code is valid' };
  }

  async assignVerificationCode(appointmentId: number): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    
    if (appointment.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Verification codes can only be assigned to approved appointments');
    }
    
    let verificationCode: string;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      verificationCode = this.generateVerificationCode();
      const existing = await this.appointmentRepo.findOne({ where: { verificationCode } });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    appointment.verificationCode = verificationCode;
    if (!appointment.bookingCode) {
      appointment.bookingCode = this.generateBookingCode();
    }
    
    const qrCode = await this.generateQRCode(verificationCode);
    if (qrCode) {
      appointment.qrCodeData = qrCode;
    }
    
    const saved = await this.appointmentRepo.save(appointment);
    
    await this.notificationsService.create({
      type: NotificationType.APPOINTMENT_APPROVED,
      title: 'Appointment Verification Code',
      message: `Your verification code for ${appointment.serviceName} is: ${verificationCode}`,
      userId: appointment.userId,
      appointmentId: appointment.id,
      metadata: { verificationCode, appointmentId: appointment.id },
    });
    
    return saved;
  }

  async checkIn(verificationCode: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { verificationCode },
    });

    if (!appointment) {
      throw new NotFoundException('Invalid verification code');
    }

    if (appointment.status === BookingStatus.CHECKED_IN) {
      throw new BadRequestException('Already checked in');
    }
    
    if (appointment.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Appointment already completed');
    }

    if (appointment.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(`Cannot check-in. Current status: ${appointment.status}`);
    }

    const appointmentTime = new Date(appointment.datetime);
    const now = new Date();
    const timeDiffMinutes = (now.getTime() - appointmentTime.getTime()) / 60000;
    
    if (timeDiffMinutes < -30) {
      throw new BadRequestException('Too early for check-in. Please arrive 30 minutes before appointment');
    }
    
    if (timeDiffMinutes > 30) {
      appointment.status = BookingStatus.EXPIRED;
      appointment.isExpired = true;
      appointment.expiredAt = now;
      await this.appointmentRepo.save(appointment);
      throw new BadRequestException('Check-in window has expired. Appointment marked as expired.');
    }

    appointment.status = BookingStatus.CHECKED_IN;
    appointment.checkedInAt = now;
    
    const saved = await this.appointmentRepo.save(appointment);
    
    await this.auditService.log({
      userId: appointment.userId,
      userEmail: appointment.userEmail,
      userName: appointment.userName,
      actionType: AuditActionType.UPDATE_APPOINTMENT,
      description: `Appointment #${appointment.id} checked in`,
      status: AuditStatus.SUCCESS,
      entityType: 'APPOINTMENT',
      entityId: appointment.id.toString(),
      actionDetails: { checkInTime: now },
    });
    
    return saved;
  }

  async completeAppointment(id: number, staffId: number): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== BookingStatus.CHECKED_IN && appointment.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(`Cannot complete appointment with status: ${appointment.status}`);
    }

    appointment.status = BookingStatus.COMPLETED;
    appointment.completedAt = new Date();
    
    const saved = await this.appointmentRepo.save(appointment);
    
    await this.notificationsService.create({
      type: NotificationType.APPOINTMENT_COMPLETED,
      title: 'Appointment Completed',
      message: `Your appointment for ${appointment.serviceName} has been completed. Thank you for choosing us!`,
      userId: appointment.userId,
      appointmentId: appointment.id,
      metadata: { completedAt: appointment.completedAt },
    });
    
    return saved;
  }

  async archiveOldAppointments(daysToKeep: number = this.ARCHIVE_DAYS): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const oldAppointments = await this.appointmentRepo.find({
      where: [
        {
          status: In([BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.EXPIRED, BookingStatus.REJECTED]),
          completedAt: LessThan(cutoffDate),
          isArchived: false,
        },
        {
          status: BookingStatus.EXPIRED,
          expiredAt: LessThan(cutoffDate),
          isArchived: false,
        }
      ],
    });

    let archivedCount = 0;
    for (const appointment of oldAppointments) {
      appointment.isArchived = true;
      appointment.archivedAt = new Date();
      appointment.status = BookingStatus.ARCHIVED;
      await this.appointmentRepo.save(appointment);
      archivedCount++;
    }

    if (archivedCount > 0) {
      this.logger.log(`Archived ${archivedCount} old appointments (older than ${daysToKeep} days)`);
    }

    return archivedCount;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateExpiredAppointments(): Promise<number> {
    try {
      const now = new Date();

      const expiredAppointments = await this.appointmentRepo.find({
        where: {
          datetime: LessThan(now),
          status: Not(In([BookingStatus.EXPIRED, BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.ARCHIVED, BookingStatus.CHECKED_IN, BookingStatus.REJECTED])),
          isExpired: false,
          isArchived: false,
        },
      });

      if (expiredAppointments.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      for (const appointment of expiredAppointments) {
        try {
          const oldStatus = appointment.status;
          appointment.status = BookingStatus.EXPIRED;
          appointment.isExpired = true;
          appointment.expiredAt = now;
          await this.appointmentRepo.save(appointment);

          if (appointment.userId) {
            await this.notificationsService.create({
              type: NotificationType.APPOINTMENT_EXPIRED,
              title: 'Appointment Expired',
              message: `Your appointment for ${appointment.serviceName} on ${format(new Date(appointment.datetime), 'MMMM d, yyyy h:mm a')} has expired.`,
              userId: appointment.userId,
              appointmentId: appointment.id,
              metadata: { expiredAt: now },
            });
          }

          await this.auditService.log({
            userId: appointment.userId,
            userEmail: appointment.userEmail,
            userName: appointment.userName,
            actionType: AuditActionType.UPDATE_APPOINTMENT,
            description: `Appointment #${appointment.id} automatically marked as expired`,
            status: AuditStatus.SUCCESS,
            entityType: 'APPOINTMENT',
            entityId: appointment.id.toString(),
            actionDetails: { oldStatus, newStatus: BookingStatus.EXPIRED },
          });

          updatedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to expire appointment ${appointment.id}: ${errorMessage}`);
        }
      }

      if (updatedCount > 0) {
        this.logger.log(`Updated ${updatedCount} appointments to EXPIRED status`);
      }

      return updatedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error updating expired appointments: ${errorMessage}`);
      return 0;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateCompletedAppointments(): Promise<number> {
    const now = new Date();
    
    const completedAppointments = await this.appointmentRepo.find({
      where: {
        status: BookingStatus.CHECKED_IN,
        checkedInAt: LessThan(new Date(now.getTime() - 60 * 60 * 1000)),
      },
    });

    let updatedCount = 0;
    for (const appointment of completedAppointments) {
      appointment.status = BookingStatus.COMPLETED;
      appointment.completedAt = now;
      await this.appointmentRepo.save(appointment);
      updatedCount++;
    }

    if (updatedCount > 0) {
      this.logger.log(`Updated ${updatedCount} appointments to COMPLETED status`);
    }

    return updatedCount;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendAppointmentReminders(): Promise<number> {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const upcomingAppointments = await this.appointmentRepo.find({
        where: {
          datetime: Between(fiveMinutesAgo, oneHourLater),
          status: BookingStatus.APPROVED,
          isArchived: false,
          reminderSent: IsNull(),
        },
      });

      let remindersSent = 0;

      for (const appointment of upcomingAppointments) {
        try {
          if (appointment.userId) {
            await this.notificationsService.create({
              type: NotificationType.APPOINTMENT_REMINDER,
              title: 'Appointment Reminder',
              message: `Reminder: Your appointment for ${appointment.serviceName} with ${appointment.providerName} is coming up at ${format(new Date(appointment.datetime), 'h:mm a')}.`,
              userId: appointment.userId,
              appointmentId: appointment.id,
              metadata: { reminderType: 'oneHour' },
            });

            appointment.reminderSent = true;
            await this.appointmentRepo.save(appointment);
            remindersSent++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to send reminder for appointment ${appointment.id}: ${errorMessage}`);
        }
      }

      if (remindersSent > 0) {
        this.logger.log(`Sent ${remindersSent} appointment reminders`);
      }

      return remindersSent;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending appointment reminders: ${errorMessage}`);
      return 0;
    }
  }

  @Cron('0 2 * * *')
  async autoArchiveOldAppointments(): Promise<number> {
    this.logger.log('Running auto-archive job for old appointments');
    return this.archiveOldAppointments(this.ARCHIVE_DAYS);
  }

  @Cron('0 3 * * *')
  async cleanupExpiredApprovalCodes(): Promise<number> {
    const expiryDate = subDays(new Date(), this.CODE_EXPIRY_DAYS);
    
    const expiredCodes = await this.appointmentRepo.find({
      where: {
        approvalCode: Not(IsNull()),
        status: BookingStatus.PENDING,
        createdAt: LessThan(expiryDate),
        isExpired: false,
      },
    });

    let cleanedCount = 0;
    for (const appointment of expiredCodes) {
      appointment.status = BookingStatus.EXPIRED;
      appointment.isExpired = true;
      appointment.expiredAt = new Date();
      await this.appointmentRepo.save(appointment);
      cleanedCount++;
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired approval codes`);
    }

    return cleanedCount;
  }

  async getAppointmentByVerificationCode(verificationCode: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { verificationCode },
     relations: { user: true },
    });

    if (!appointment) {
      throw new NotFoundException('Invalid verification code');
    }

    return appointment;
  }

  async cancelBooking(id: number, userId: number, reason: string, role: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (role !== 'admin' && appointment.userId !== userId) {
      throw new BadRequestException('Unauthorized to cancel this booking');
    }

    if (appointment.status !== BookingStatus.PENDING && appointment.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(`Cannot cancel booking with status: ${appointment.status}`);
    }

    appointment.status = BookingStatus.CANCELLED;
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason;

    const saved = await this.appointmentRepo.save(appointment);
    
    await this.notificationsService.create({
      type: NotificationType.APPOINTMENT_CANCELLED,
      title: 'Appointment Cancelled',
      message: `Your appointment for ${appointment.serviceName} has been cancelled. Reason: ${reason || 'No reason provided'}`,
      userId: appointment.userId,
      appointmentId: appointment.id,
      metadata: { cancelledAt: appointment.cancelledAt, reason },
    });

    return saved;
  }

  async getBookingStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    expired: number;
    rejected: number;
    archived: number;
  }> {
    const [total, pending, approved, checkedIn, completed, cancelled, expired, rejected, archived] = await Promise.all([
      this.appointmentRepo.count(),
      this.appointmentRepo.count({ where: { status: BookingStatus.PENDING, isArchived: false } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.APPROVED, isArchived: false } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.CHECKED_IN, isArchived: false } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.COMPLETED, isArchived: false } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.CANCELLED, isArchived: false } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.EXPIRED, isArchived: false } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.REJECTED, isArchived: false } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.ARCHIVED } }),
    ]);

    return { total, pending, approved, checkedIn, completed, cancelled, expired, rejected, archived };
  }

  getTimeLeft(appointment: Appointment): { 
    hasExpired: boolean; 
    timeLeftText: string; 
    hoursLeft: number;
    minutesLeft: number;
    isUrgent: boolean;
  } {
    const now = new Date();
    const appointmentTime = new Date(appointment.datetime);
    
    if (isBefore(appointmentTime, now)) {
      return {
        hasExpired: true,
        timeLeftText: 'Expired',
        hoursLeft: 0,
        minutesLeft: 0,
        isUrgent: false,
      };
    }
    
    const diffMs = appointmentTime.getTime() - now.getTime();
    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diffMs % (3600000)) / 60000);
    
    let timeLeftText = '';
    let isUrgent = false;
    
    if (hoursLeft < 1) {
      timeLeftText = `${minutesLeft} minutes left`;
      isUrgent = true;
    } else if (hoursLeft < 24) {
      timeLeftText = `${hoursLeft}h ${minutesLeft}m left`;
      isUrgent = hoursLeft < 2;
    } else {
      timeLeftText = `${Math.floor(hoursLeft / 24)} days left`;
    }
    
    return {
      hasExpired: false,
      timeLeftText,
      hoursLeft,
      minutesLeft,
      isUrgent,
    };
  }
}