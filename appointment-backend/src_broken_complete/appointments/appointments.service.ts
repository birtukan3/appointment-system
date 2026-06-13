import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThan, LessThan, ILike, Not } from 'typeorm';
import { Appointment, BookingStatus, BookingPriority } from './appointment.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { format } from 'date-fns';
import { AuditService } from '../audit/audit.service';
import { AuditActionType, AuditStatus } from '../audit/audit.entity';
import { Upload } from '../uploads/upload.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
    @InjectRepository(Upload)
    private uploadRepo: Repository<Upload>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
  ) {}

  private generateBookingCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BK-${timestamp}-${random}`;
  }

  private generateApprovalCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async getUserBookingLimits(userId: number, userEmail: string): Promise<any> {
    const user = await this.usersService.findById(userId);
    const role = user?.role || 'user';
    
    let daily = 3, weekly = 10, monthly = 30, active = 3;
    
    if (role === 'admin') {
      daily = 50; weekly = 100; monthly = 500; active = 50;
    } else if (role === 'staff') {
      daily = 15; weekly = 30; monthly = 100; active = 20;
    }
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const excludedStatuses = ['cancelled', 'rejected', 'expired', 'archived'];
    const activeStatuses = ['pending', 'approved', 'checked_in'];
    
    const [dailyCount, weeklyCount, monthlyCount, activeCount] = await Promise.all([
      this.repo.count({ 
        where: { 
          userEmail, 
          datetime: Between(todayStart, todayEnd), 
          status: Not(In(excludedStatuses)) 
        } 
      }),
      this.repo.count({ 
        where: { 
          userEmail, 
          datetime: Between(weekStart, now), 
          status: Not(In(excludedStatuses)) 
        } 
      }),
      this.repo.count({ 
        where: { 
          userEmail, 
          datetime: Between(monthStart, now), 
          status: Not(In(excludedStatuses)) 
        } 
      }),
      this.repo.count({ 
        where: { 
          userEmail, 
          status: In(activeStatuses), 
          datetime: MoreThan(now) 
        } 
      }),
    ]);
    
    return {
      limits: { daily, weekly, monthly, active, isVIP: false, unlimited: false, isBlocked: false, spamScore: 0 },
      counts: { daily: dailyCount, weekly: weeklyCount, monthly: monthlyCount, active: activeCount },
      remaining: {
        daily: Math.max(0, daily - dailyCount),
        weekly: Math.max(0, weekly - weeklyCount),
        monthly: Math.max(0, monthly - monthlyCount),
        active: Math.max(0, active - activeCount),
      },
    };
  }

  async getUserBookingStats(userId: number): Promise<any> {
    const user = await this.usersService.findById(userId);
    const role = user?.role || 'user';
    
    let dailyLimit = 3, pendingLimit = 2;
    if (role === 'admin') { dailyLimit = 50; pendingLimit = 20; }
    else if (role === 'staff') { dailyLimit = 15; pendingLimit = 10; }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [todayCount, pendingCount] = await Promise.all([
      this.repo.count({ where: { userId, datetime: Between(today, tomorrow), isArchived: false } }),
      this.repo.count({ where: { userId, status: BookingStatus.PENDING, isArchived: false } }),
    ]);
    
    return { todayCount, pendingCount, dailyLimit, pendingLimit, role };
  }

  async create(data: {
    serviceName: string;
    providerName: string;
    datetime: Date;
    userId: number;
    userEmail: string;
    userName: string;
    notes?: string;
    duration?: number;
    forSelf?: boolean;
    priority?: string;
    fileIds?: number[];
    patientName?: string;
    age?: number;
    gender?: string;
    patientEmail?: string;
    patientPhone?: string;
    ip?: string;
  }) {
    const startTime = new Date(data.datetime);
    const durationMinutes = data.duration || 60;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    
    const dayStart = new Date(data.datetime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(data.datetime);
    dayEnd.setHours(23, 59, 59, 999);
    
    const existingAppointments = await this.repo.find({
      where: {
        providerName: data.providerName,
        datetime: Between(dayStart, dayEnd),
        status: In([BookingStatus.PENDING, BookingStatus.APPROVED]),
        isArchived: false,
      }
    });
    
    for (const existing of existingAppointments) {
      const existingStart = new Date(existing.datetime);
      const existingEnd = new Date(existingStart.getTime() + (existing.duration || 60) * 60000);
      
      if ((startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)) {
        throw new ForbiddenException(
          `Time conflict! ${existing.serviceName} already booked at ${format(existingStart, 'h:mm a')}.`
        );
      }
    }
    
    let approvalCode = this.generateApprovalCode();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const existing = await this.repo.findOne({ where: { approvalCode } });
      if (!existing) isUnique = true;
      else approvalCode = this.generateApprovalCode();
      attempts++;
    }
    
    const priorityMap: Record<string, BookingPriority> = {
      urgent: BookingPriority.URGENT,
      high: BookingPriority.HIGH,
      low: BookingPriority.LOW,
    };
    
    const appointment = this.repo.create({
      serviceName: data.serviceName,
      providerName: data.providerName,
      datetime: data.datetime,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      notes: data.notes || '',
      duration: durationMinutes,
      forSelf: data.forSelf !== undefined ? data.forSelf : true,
      priority: priorityMap[data.priority?.toLowerCase()] || BookingPriority.NORMAL,
      bookingCode: this.generateBookingCode(),
      approvalCode: approvalCode,
      status: BookingStatus.PENDING,
      isArchived: false,
      isExpired: false,
      createdIp: data.ip,
    });
    
    if (!data.forSelf) {
      appointment.patientName = data.patientName;
      appointment.age = data.age;
      appointment.gender = data.gender;
      appointment.patientEmail = data.patientEmail;
      appointment.patientPhone = data.patientPhone;
    }
    
    const saved = await this.repo.save(appointment);
    
    if (data.fileIds && data.fileIds.length > 0) {
      await this.uploadRepo.update(
        { id: In(data.fileIds) },
        { appointmentId: saved.id }
      );
    }
    
    await this.auditService.log({
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      actionType: AuditActionType.CREATE_APPOINTMENT,
      description: `Created appointment for ${data.serviceName}`,
      status: AuditStatus.SUCCESS,
      entityType: 'APPOINTMENT',
      entityId: saved.id.toString(),
      ipAddress: data.ip,
    });

    await this.notificationsService.create({
      userId: data.userId,
      title: 'Appointment Booked',
      message: `Your appointment has been booked. Approval code: ${approvalCode}`,
      type: NotificationType.APPOINTMENT_CONFIRMED,
      appointmentId: saved.id,
    });
    
    this.eventEmitter.emit('appointment.created', saved);
    this.logger.log(`Appointment created: ${saved.id} for user ${data.userId}`);
    return saved;
  }

  async findAll(query?: any) {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? Math.min(parseInt(query.limit), 50) : 10;
    const skip = (page - 1) * limit;
    
    const where: any = { isArchived: false };
    
    if (query?.search) where.serviceName = ILike(`%${query.search}%`);
    if (query?.status && query.status !== 'all') where.status = query.status;
    if (query?.priority && query.priority !== 'all') where.priority = query.priority;
    if (query?.providerName) where.providerName = query.providerName;
    
    if (query?.dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.datetime = MoreThan(today);
    } else if (query?.dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.datetime = MoreThan(weekAgo);
    } else if (query?.dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      where.datetime = MoreThan(monthAgo);
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { datetime: 'DESC' },
      skip,
      take: limit,
    });

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findByUser(email: string, query?: any) {
    const appointments = await this.repo.find({
      where: { userEmail: email, isArchived: false },
      order: { datetime: 'DESC' },
    });
    return appointments;
  }

  async findOne(id: number) {
    const appointment = await this.repo.findOne({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async getAppointmentFiles(appointmentId: number) {
    return this.uploadRepo.find({
      where: { appointmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: number, status: string, comment?: string, userId?: number) {
    const appointment = await this.findOne(id);
    
    const oldStatus = appointment.status;
    appointment.status = status as BookingStatus;
    if (comment) appointment.comment = comment;
    
    if (status === BookingStatus.APPROVED) appointment.approvedAt = new Date();
    else if (status === BookingStatus.REJECTED) appointment.rejectedAt = new Date();
    else if (status === BookingStatus.CANCELLED) appointment.cancelledAt = new Date();
    else if (status === BookingStatus.COMPLETED) appointment.completedAt = new Date();
    
    const result = await this.repo.save(appointment);
    
    let notificationType: NotificationType;
    let title = '';
    let message = '';

    switch (appointment.status) {
      case BookingStatus.APPROVED:
        notificationType = NotificationType.APPOINTMENT_APPROVED;
        title = 'Appointment Approved';
        message = `Your appointment for ${appointment.serviceName} has been approved!`;
        break;
      case BookingStatus.REJECTED:
        notificationType = NotificationType.APPOINTMENT_REJECTED;
        title = 'Appointment Rejected';
        message = `Your appointment for ${appointment.serviceName} has been rejected.${comment ? ` Reason: ${comment}` : ''}`;
        break;
      case BookingStatus.COMPLETED:
        notificationType = NotificationType.APPOINTMENT_COMPLETED;
        title = 'Appointment Completed';
        message = `Your appointment for ${appointment.serviceName} has been completed. Thank you!`;
        break;
      case BookingStatus.CANCELLED:
        notificationType = NotificationType.APPOINTMENT_CANCELLED;
        title = 'Appointment Cancelled';
        message = `Your appointment for ${appointment.serviceName} has been cancelled.`;
        break;
      default:
        return result;
    }

    if (appointment.userId) {
      await this.notificationsService.create({
        userId: appointment.userId,
        title,
        message,
        type: notificationType,
        appointmentId: id,
        metadata: { comment, oldStatus, newStatus: status },
      });
    }
    
    await this.auditService.log({
      userId: userId || appointment.userId,
      userEmail: appointment.userEmail,
      userName: appointment.userName,
      actionType: status === BookingStatus.APPROVED ? AuditActionType.APPROVE_APPOINTMENT : 
                  status === BookingStatus.REJECTED ? AuditActionType.REJECT_APPOINTMENT :
                  AuditActionType.UPDATE_APPOINTMENT,
      description: `Appointment ${status} for ${appointment.serviceName}`,
      status: AuditStatus.SUCCESS,
      entityType: 'APPOINTMENT',
      entityId: id.toString(),
      actionDetails: { oldStatus, newStatus: status, comment },
    });
    
    this.eventEmitter.emit('appointment.status.updated', { appointmentId: id, oldStatus, newStatus: status });
    this.logger.log(`Appointment ${id} status updated from ${oldStatus} to ${status}`);
    return result;
  }

  async cancel(id: number, userEmail: string, role: string) {
    const appointment = await this.findOne(id);
    if (role !== 'admin' && appointment.userEmail !== userEmail) {
      throw new ForbiddenException('Cannot cancel this appointment');
    }
    
    appointment.status = BookingStatus.CANCELLED;
    appointment.isArchived = true;
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = 'Cancelled by user';
    
    const saved = await this.repo.save(appointment);
    
    await this.auditService.log({
      userId: appointment.userId,
      userEmail: appointment.userEmail,
      userName: appointment.userName,
      actionType: AuditActionType.DELETE_APPOINTMENT,
      description: `Cancelled appointment for ${appointment.serviceName}`,
      status: AuditStatus.SUCCESS,
      entityType: 'APPOINTMENT',
      entityId: id.toString(),
    });
    
    await this.notificationsService.create({
      userId: appointment.userId,
      title: 'Appointment Cancelled',
      message: `Your appointment for ${appointment.serviceName} has been cancelled.`,
      type: NotificationType.APPOINTMENT_CANCELLED,
      appointmentId: id,
    });
    
    return saved;
  }

  async archiveAppointment(id: number) {
    const appointment = await this.findOne(id);
    appointment.isArchived = true;
    appointment.archivedAt = new Date();
    appointment.status = BookingStatus.ARCHIVED;
    return this.repo.save(appointment);
  }

  async getAvailableSlots(staffId: number, date: string, duration: number = 60) {
    const staff = await this.usersService.findById(staffId);
    if (!staff?.name) return { bookedSlots: [] };
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const booked = await this.repo.find({
      where: {
        providerName: staff.name,
        datetime: Between(startDate, endDate),
        status: In([BookingStatus.PENDING, BookingStatus.APPROVED]),
        isArchived: false
      }
    });
    
    const bookedSlots = booked.map(apt => ({
      start: format(new Date(apt.datetime), 'HH:mm'),
      end: format(new Date(new Date(apt.datetime).getTime() + (apt.duration || 60) * 60000), 'HH:mm'),
      service: apt.serviceName,
      id: apt.id
    }));
    
    return { bookedSlots };
  }

  async getStats() {
    const [total, pending, approved, rejected, expired] = await Promise.all([
      this.repo.count({ where: { isArchived: false } }),
      this.repo.count({ where: { status: BookingStatus.PENDING, isArchived: false } }),
      this.repo.count({ where: { status: BookingStatus.APPROVED, isArchived: false } }),
      this.repo.count({ where: { status: BookingStatus.REJECTED, isArchived: false } }),
      this.repo.count({ where: { status: BookingStatus.EXPIRED, isArchived: false } }),
    ]);
    
    return { total, pending, approved, rejected, expired };
  }

  async export(filters: any): Promise<string> {
    let appointments;
    if (filters.startDate || filters.endDate || filters.status) {
      const where: any = {};
      if (filters.startDate) {
        where.datetime = MoreThan(new Date(filters.startDate));
      }
      if (filters.endDate) {
        where.datetime = LessThan(new Date(filters.endDate));
      }
      if (filters.status && filters.status !== 'all') {
        where.status = filters.status;
      }
      appointments = await this.repo.find({ where, order: { datetime: 'DESC' } });
    } else {
      appointments = await this.repo.find({ order: { datetime: 'DESC' } });
    }

    const csvRows = [['ID', 'Booking Code', 'Service', 'Provider', 'Date', 'Time', 'Status', 'Priority', 'Notes', 'User Email', 'User Name']];
    
    for (const app of appointments) {
      const date = new Date(app.datetime);
      csvRows.push([
        app.id.toString(),
        app.bookingCode || '',
        app.serviceName,
        app.providerName,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        app.status,
        app.priority || 'Normal',
        app.notes || '',
        app.userEmail,
        app.userName,
      ]);
    }
    
    return csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async archiveExpiredAppointments(): Promise<number> {
    const now = new Date();
    const expired = await this.repo.find({
      where: {
        datetime: LessThan(now),
        status: BookingStatus.PENDING,
        isExpired: false,
        isArchived: false
      }
    });
    
    for (const apt of expired) {
      apt.isExpired = true;
      apt.status = BookingStatus.EXPIRED;
      apt.isArchived = true;
      apt.archivedAt = now;
      apt.expiredAt = now;
      await this.repo.save(apt);
      
      await this.notificationsService.create({
        userId: apt.userId,
        title: 'Appointment Expired',
        message: `Your appointment for ${apt.serviceName} has expired.`,
        type: NotificationType.APPOINTMENT_EXPIRED,
        appointmentId: apt.id,
      });
    }
    
    return expired.length;
  }

  async approveWithCode(approvalCode: string) {
    const appointment = await this.repo.findOne({ where: { approvalCode: approvalCode.toUpperCase() } });
    if (!appointment) throw new NotFoundException('Invalid approval code');
    if (appointment.status !== BookingStatus.PENDING) throw new BadRequestException(`Already ${appointment.status}`);
    if (new Date(appointment.datetime) < new Date()) throw new BadRequestException('Appointment expired');
    
    appointment.status = BookingStatus.APPROVED;
    appointment.approvedAt = new Date();
    const result = await this.repo.save(appointment);
    
    await this.notificationsService.create({
      userId: appointment.userId,
      title: 'Appointment Approved',
      message: `Your appointment has been approved!`,
      type: NotificationType.APPOINTMENT_APPROVED,
      appointmentId: appointment.id,
    });
    
    await this.auditService.log({
      userId: appointment.userId || null,
      userEmail: appointment.userEmail || null,
      userName: appointment.userName || null,
      actionType: AuditActionType.APPROVE_WITH_CODE,
      description: `Appointment approved using code ${approvalCode}`,
      status: AuditStatus.SUCCESS,
      entityType: 'APPOINTMENT',
      entityId: appointment.id.toString(),
      actionDetails: { approvalCode },
    });

    return result;
  }

  async addFeedback(id: number, rating: number, comment: string) {
    const appointment = await this.findOne(id);
    
    if (appointment.feedbackGiven) {
      throw new BadRequestException('Feedback already submitted for this appointment');
    }
    
    if (appointment.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Feedback can only be submitted for completed appointments');
    }
    
    appointment.feedbackRating = rating;
    appointment.feedbackComment = comment;
    appointment.feedbackGiven = true;
    appointment.feedbackDate = new Date();
    
    const saved = await this.repo.save(appointment);
    
    await this.auditService.log({
      userId: appointment.userId,
      userEmail: appointment.userEmail,
      userName: appointment.userName,
      actionType: AuditActionType.SUBMIT_FEEDBACK,
      description: `Submitted feedback for appointment ${id}`,
      status: AuditStatus.SUCCESS,
      entityType: 'APPOINTMENT',
      entityId: id.toString(),
      actionDetails: { rating },
    });
    
    return { success: true, data: saved };
  }
}

