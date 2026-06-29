import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, Not } from 'typeorm';
import { Appointment, BookingStatus, BookingPriority } from './appointment.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    public readonly repo: Repository<Appointment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(data: any, userId: number) {
    try {
      this.logger.log(`📝 Creating appointment for user: ${userId}`);

      // ✅ BUILD APPOINTMENT WITH ONLY EXISTING FIELDS
      const appointment = new Appointment();
      
      // Required fields
      appointment.serviceName = data.serviceName || 'Consultation';
      appointment.providerName = data.providerName || data.expertName || 'Staff';
      appointment.datetime = data.datetime ? new Date(data.datetime) : new Date();
      appointment.userId = userId;
      
      // User info with fallbacks - CRITICAL FIX
      appointment.userEmail = data.userEmail || data.clientEmail || 'user@example.com';
      appointment.userName = data.userName || data.clientName || 'User';
      
      // Optional fields
      appointment.notes = data.notes || '';
      appointment.status = BookingStatus.PENDING;
      appointment.priority = data.priority || BookingPriority.NORMAL;
      appointment.duration = data.duration || 60;
      
      // Additional fields - only if they exist in entity
      if (data.endTime) {
        appointment.endTime = new Date(data.endTime);
      }
      
      // Generate codes
      appointment.bookingCode = data.bookingCode || this.generateBookingCode();
      appointment.approvalCode = data.approvalCode || this.generateApprovalCode();
      appointment.verificationCode = data.verificationCode || this.generateVerificationCode();
      
      // Default values
      appointment.isExpired = false;
      appointment.isArchived = false;
      appointment.feedbackGiven = false;
      appointment.reminderSent = false;
      appointment.metadata = data.metadata || {};

      this.logger.log(`✅ Creating appointment with: ${appointment.userName} (${appointment.userEmail})`);
      this.logger.log(`📊 Appointment data:`, {
        serviceName: appointment.serviceName,
        providerName: appointment.providerName,
        datetime: appointment.datetime,
        userId: appointment.userId,
        userEmail: appointment.userEmail,
        userName: appointment.userName,
        duration: appointment.duration,
        priority: appointment.priority,
        status: appointment.status
      });

      const saved = await this.repo.save(appointment);
      this.logger.log(`✅ Appointment created with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`❌ Error creating appointment: ${error.message}`);
      this.logger.error('Stack:', error.stack);
      
      if (error.code === '23502') {
        throw new BadRequestException(`Missing required field: ${error.column}`);
      }
      if (error.code === '23505') {
        throw new BadRequestException('Duplicate appointment detected');
      }
      
      throw new BadRequestException(`Failed to create appointment: ${error.message}`);
    }
  }

  private generateBookingCode(): string {
    return `BK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private generateApprovalCode(): string {
    return `APP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async findAll(query: any = {}) {
    const { page = 1, limit = 10, status, startDate, endDate } = query;
    const where: any = {};
    
    if (status) where.status = status;
    if (startDate && endDate) {
      where.datetime = Between(new Date(startDate), new Date(endDate));
    }
    
    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { datetime: 'DESC' },
    });
    
    return { data, total, page: +page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const appointment = await this.repo.findOne({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async findByUser(email: string) {
    return await this.repo.find({
      where: { userEmail: email },
      order: { datetime: 'DESC' },
    });
  }

  async findByUserId(userId: number) {
    return await this.repo.find({
      where: { userId },
      order: { datetime: 'DESC' },
    });
  }

  async updateStatus(id: number, status: string, comment?: string, userId?: number) {
    const appointment = await this.findOne(id);
    appointment.status = status as BookingStatus;
    if (comment) appointment.notes = comment;
    
    if (status === BookingStatus.COMPLETED) {
      appointment.completedAt = new Date();
    }
    if (status === BookingStatus.CANCELLED) {
      appointment.cancelledAt = new Date();
      appointment.cancellationReason = comment || '';
    }
    if (status === BookingStatus.CHECKED_IN) {
      appointment.checkedInAt = new Date();
    }
    
    return await this.repo.save(appointment);
  }

  async cancel(id: number, email: string, role: string) {
    const appointment = await this.findOne(id);
    if (appointment.userEmail !== email && role !== 'admin') {
      throw new Error('Unauthorized to cancel this appointment');
    }
    appointment.status = BookingStatus.CANCELLED;
    appointment.cancelledAt = new Date();
    return await this.repo.save(appointment);
  }

  async addFeedback(id: number, rating: number, comment?: string) {
    const appointment = await this.findOne(id);
    appointment.feedbackGiven = true;
    appointment.feedbackRating = rating;
    appointment.feedbackComment = comment || '';
    appointment.feedbackDate = new Date();
    return await this.repo.save(appointment);
  }

  async getStats() {
    const total = await this.repo.count();
    const pending = await this.repo.count({ where: { status: BookingStatus.PENDING } });
    const approved = await this.repo.count({ where: { status: BookingStatus.APPROVED } });
    const completed = await this.repo.count({ where: { status: BookingStatus.COMPLETED } });
    const cancelled = await this.repo.count({ where: { status: BookingStatus.CANCELLED } });
    
    return { total, pending, approved, completed, cancelled };
  }

  async getUserBookingStats(userId: number) {
    const appointments = await this.repo.find({ where: { userId } });
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === BookingStatus.PENDING).length;
    const approved = appointments.filter(a => a.status === BookingStatus.APPROVED).length;
    const completed = appointments.filter(a => a.status === BookingStatus.COMPLETED).length;
    
    return { total, pending, approved, completed };
  }

  async getUserBookingLimits(userId: number, email: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await this.repo.count({
      where: { userEmail: email, datetime: Between(today, tomorrow) }
    });
    
    return { daily: 3, used: todayCount, remaining: Math.max(0, 3 - todayCount) };
  }

  async getAvailableSlots(staffId: number, date: string, duration: number) {
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const existingBookings = await this.repo.find({
      where: {
        datetime: Between(startDate, endDate),
        status: Not(BookingStatus.CANCELLED),
      }
    });
    
    const bookedTimes = existingBookings.map(b => 
      new Date(b.datetime).getHours()
    );
    
    for (let hour = startHour; hour < endHour; hour++) {
      const isBooked = bookedTimes.includes(hour);
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        display: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
        available: !isBooked,
        bookedBy: isBooked ? 'existing' : null,
      });
    }
    
    return slots;
  }

  async approveWithCode(approvalCode: string) {
    const appointment = await this.repo.findOne({ where: { approvalCode } });
    if (!appointment) throw new NotFoundException('Invalid approval code');
    appointment.status = BookingStatus.APPROVED;
    return await this.repo.save(appointment);
  }

  async archiveExpiredAppointments() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const expired = await this.repo.find({
      where: {
        status: BookingStatus.COMPLETED,
        completedAt: LessThan(thirtyDaysAgo),
        isArchived: false,
      }
    });
    
    for (const apt of expired) {
      apt.isArchived = true;
      apt.archivedAt = new Date();
      await this.repo.save(apt);
    }
    
    return expired.length;
  }

  async archiveAppointment(id: number) {
    const appointment = await this.findOne(id);
    appointment.isArchived = true;
    appointment.archivedAt = new Date();
    return await this.repo.save(appointment);
  }

  async getAppointmentFiles(id: number) {
    return [];
  }

  async export(filters: any) {
    const appointments = await this.repo.find();
    return appointments;
  }
}