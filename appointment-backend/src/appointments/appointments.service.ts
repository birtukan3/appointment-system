import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Appointment } from './appointment.entity';
import { UsersService } from '../users/users.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import ExcelJS from 'exceljs';
import { ExportOptionsDto } from './dto/export-options.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
    private readonly usersService: UsersService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async create(data: {
    serviceName: string;
    providerName: string;
    datetime: Date;
    userId?: number;
    userEmail: string;
    userName: string;
    age?: number;
    gender?: string;
    company?: string;
    priority?: string;
    forSelf?: boolean;
    patientName?: string;
    notes?: string;
  }) {
    const existing = await this.repo.findOne({
      where: {
        providerName: data.providerName,
        datetime: data.datetime,
        status: In(['Pending', 'Approved']),
        isArchived: false,
      },
    });

    if (existing) {
      throw new ForbiddenException('This time slot is already booked');
    }

    const appointment = this.repo.create({
      ...data,
      forSelf: data.forSelf ?? true,
      status: 'Pending',
      isArchived: false,
      calendarSynced: false,
    });

    return this.repo.save(appointment);
  }

  private buildFilteredQuery(filters: QueryAppointmentDto = {}) {
    const query = this.repo
      .createQueryBuilder('appointment')
      .where('appointment.isArchived = :isArchived', { isArchived: false });

    if (filters.startDate) {
      query.andWhere('appointment.datetime >= :startDate', {
        startDate: new Date(`${filters.startDate}T00:00:00`),
      });
    }

    if (filters.endDate) {
      query.andWhere('appointment.datetime <= :endDate', {
        endDate: new Date(`${filters.endDate}T23:59:59.999`),
      });
    }

    if (filters.status && filters.status !== 'all') {
      query.andWhere('appointment.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere(
        '(LOWER(appointment.serviceName) LIKE LOWER(:search) OR LOWER(appointment.providerName) LIKE LOWER(:search) OR LOWER(appointment.userEmail) LIKE LOWER(:search) OR LOWER(appointment.userName) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('appointment.datetime', 'DESC');

    if (filters.limit) {
      const skip = ((filters.page || 1) - 1) * filters.limit;
      query.skip(skip).take(filters.limit);
    }

    return query;
  }

  async findAll(filters: QueryAppointmentDto = {}) {
    return this.buildFilteredQuery(filters).getMany();
  }

  async findByUser(email: string, filters: QueryAppointmentDto = {}) {
    return this.buildFilteredQuery(filters)
      .andWhere('appointment.userEmail = :email', { email })
      .getMany();
  }

  async findByProvider(providerName: string, filters: QueryAppointmentDto = {}) {
    return this.buildFilteredQuery(filters)
      .andWhere('appointment.providerName = :providerName', { providerName })
      .getMany();
  }

  async findOne(id: number) {
    const appointment = await this.repo.findOne({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async updateStatus(id: number, status: string, comment?: string) {
    const appointment = await this.findOne(id);
    appointment.status = status;

    if (comment !== undefined) {
      appointment.comment = comment || null;
    } else if (status !== 'Rejected') {
      appointment.comment = null;
    }

    if (status === 'Approved') {
      await this.syncCalendarEvent(appointment);
    } else if (appointment.calendarEventId) {
      await this.clearCalendarEvent(appointment);
    }

    return this.repo.save(appointment);
  }

  async cancel(id: number, userEmail: string, role: string = 'user') {
    const appointment = await this.findOne(id);

    if (role !== 'admin' && appointment.userEmail !== userEmail) {
      throw new ForbiddenException('You can only cancel your own appointments');
    }

    if (role !== 'admin' && appointment.status !== 'Pending') {
      throw new ForbiddenException('Cannot cancel processed appointment');
    }

    if (appointment.calendarEventId) {
      await this.clearCalendarEvent(appointment);
    }

    appointment.isArchived = true;
    return this.repo.save(appointment);
  }

  async getStats(userEmail?: string, providerName?: string) {
    let query = this.repo
      .createQueryBuilder('appointment')
      .where('appointment.isArchived = :isArchived', { isArchived: false });

    if (providerName) {
      query = query.andWhere('appointment.providerName = :providerName', { providerName });
    }

    if (userEmail) {
      query = query.andWhere('appointment.userEmail = :email', { email: userEmail });
    }

    const total = await query.getCount();
    const pending = await query
      .clone()
      .andWhere('appointment.status = :status', { status: 'Pending' })
      .getCount();
    const approved = await query
      .clone()
      .andWhere('appointment.status = :status', { status: 'Approved' })
      .getCount();
    const rejected = await query
      .clone()
      .andWhere('appointment.status = :status', { status: 'Rejected' })
      .getCount();
    
    const now = new Date();
    const upcoming = await query
      .clone()
      .andWhere('appointment.datetime >= :now', { now })
      .getCount();

    return { total, pending, approved, rejected, upcoming };
  }

  async checkAvailability(providerName: string, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const booked = await this.repo.find({
      where: {
        providerName,
        datetime: Between(startDate, endDate),
        status: In(['Pending', 'Approved']),
        isArchived: false,
      },
    });

    const dbBookedSlots = booked.map(b => {
      const hours = b.datetime.getHours().toString().padStart(2, '0');
      const minutes = b.datetime.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    });

    const provider = await this.usersService.findByProviderName(providerName);
    const calendarBusySlots = provider?.email
      ? await this.googleCalendarService.getBusySlots(provider.email, date)
      : [];

    const bookedSlots = Array.from(new Set([...dbBookedSlots, ...calendarBusySlots])).sort();

    return { bookedSlots };
  }

  async exportAppointments(options: ExportOptionsDto = {}): Promise<Buffer> {
    const query = this.repo
      .createQueryBuilder('appointment')
      .where('appointment.isArchived = :isArchived', { isArchived: false });

    if (options.startDate) {
      query.andWhere('appointment.datetime >= :startDate', {
        startDate: new Date(`${options.startDate}T00:00:00`),
      });
    }

    if (options.endDate) {
      query.andWhere('appointment.datetime <= :endDate', {
        endDate: new Date(`${options.endDate}T23:59:59.999`),
      });
    }

    if (options.status && options.status !== 'all') {
      query.andWhere('appointment.status = :status', { status: options.status });
    }

    const appointments = await query.orderBy('appointment.datetime', 'DESC').getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Appointments');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Service', key: 'serviceName', width: 28 },
      { header: 'Provider', key: 'providerName', width: 28 },
      { header: 'Customer', key: 'userName', width: 24 },
      { header: 'Customer Email', key: 'userEmail', width: 32 },
      { header: 'Date/Time', key: 'datetime', width: 24 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Priority', key: 'priority', width: 16 },
      { header: 'Company', key: 'company', width: 24 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'Comment', key: 'comment', width: 32 },
      { header: 'Calendar Synced', key: 'calendarSynced', width: 18 },
      { header: 'Created At', key: 'createdAt', width: 24 },
    ];

    worksheet.getRow(1).font = { bold: true };

    appointments.forEach((appointment) => {
      worksheet.addRow({
        id: appointment.id,
        serviceName: appointment.serviceName,
        providerName: appointment.providerName,
        userName: appointment.userName,
        userEmail: appointment.userEmail,
        datetime: appointment.datetime?.toISOString() || '',
        status: appointment.status,
        priority: appointment.priority,
        company: appointment.company || '',
        notes: appointment.notes || '',
        comment: appointment.comment || '',
        calendarSynced: appointment.calendarSynced ? 'Yes' : 'No',
        createdAt: appointment.createdAt?.toISOString() || '',
      });
    });

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output);
  }

  private async syncCalendarEvent(appointment: Appointment): Promise<void> {
    const provider = await this.usersService.findByProviderName(appointment.providerName);

    const calendarData = appointment.calendarEventId
      ? await this.googleCalendarService.updateCalendarEvent(
          appointment.calendarEventId,
          appointment,
          provider?.email,
        )
      : await this.googleCalendarService.createCalendarEvent(appointment, provider?.email);

    if (!calendarData.synced) {
      appointment.calendarSynced = Boolean(
        appointment.calendarEventId && appointment.calendarEventLink,
      );

      if (!appointment.calendarEventId) {
        appointment.calendarEventLink = null;
        appointment.meetLink = null;
      }

      return;
    }

    appointment.calendarEventId = calendarData.eventId || appointment.calendarEventId || null;
    appointment.calendarEventLink =
      calendarData.eventLink || appointment.calendarEventLink || null;
    appointment.meetLink = calendarData.meetLink || appointment.meetLink || null;
    appointment.calendarSynced = true;
  }

  private async clearCalendarEvent(appointment: Appointment): Promise<void> {
    if (appointment.calendarEventId) {
      try {
        await this.googleCalendarService.deleteCalendarEvent(appointment.calendarEventId);
      } catch (error) {
        // Keep appointment updates flowing even if external calendar cleanup fails.
      }
    }

    appointment.calendarEventId = null;
    appointment.calendarEventLink = null;
    appointment.meetLink = null;
    appointment.calendarSynced = false;
  }
}