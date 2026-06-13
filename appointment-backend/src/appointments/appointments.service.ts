import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan, Not, IsNull } from 'typeorm';
import { Appointment, BookingStatus, BookingPriority } from './appointment.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    public readonly repo: Repository<Appointment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(data: any, userId: number) {
    const appointment = this.repo.create({
      serviceName: data.serviceName,
      providerName: data.providerName,
      datetime: new Date(data.datetime),
      userId: userId,
      userEmail: data.userEmail,
      userName: data.userName,
      notes: data.notes || '',
      status: BookingStatus.PENDING,
      priority: data.priority || BookingPriority.NORMAL,
      duration: data.duration || 60,
    });
    return await this.repo.save(appointment);
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
    // Simple implementation - returns time slots
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push({
        time: `${hour}:00`,
        available: true,
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
    return []; // Return files for appointment
  }

  async export(filters: any) {
    const appointments = await this.repo.find();
    return appointments;
  }
}
