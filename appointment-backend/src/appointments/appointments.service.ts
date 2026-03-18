import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
  ) {}

  async create(dto: CreateAppointmentDto, email: string): Promise<Appointment> {
    const existing = await this.repo.findOne({
      where: {
        providerName: dto.providerName,
        datetime: dto.datetime,
        status: 'Pending',
        isArchived: false,
      }
    });

    if (existing) {
      throw new ForbiddenException('This time slot is already booked');
    }

    const appointment = this.repo.create({
      ...dto,
      userEmail: email,
      status: 'Pending'
    });
    
    return await this.repo.save(appointment);
  }

  async findAll(): Promise<Appointment[]> {
    return await this.repo.find({
      where: { isArchived: false },
      order: { datetime: 'DESC' }
    });
  }

  async findOne(id: number): Promise<Appointment> {
    const appointment = await this.repo.findOne({
      where: { id, isArchived: false }
    });
    
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    
    return appointment;
  }

  async findByEmail(email: string): Promise<Appointment[]> {
    return await this.repo.find({
      where: { userEmail: email, isArchived: false },
      order: { datetime: 'DESC' }
    });
  }

  async findByProvider(providerName: string): Promise<Appointment[]> {
    return await this.repo.find({
      where: { providerName, isArchived: false },
      order: { datetime: 'DESC' }
    });
  }

  async update(
    id: number,
    dto: UpdateAppointmentDto,
    role: string,
    email?: string,
    name?: string
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (role === 'user' && appointment.userEmail !== email) {
      throw new ForbiddenException('You can only update your own appointments');
    }
    
    if (role === 'staff' && appointment.providerName !== name) {
      throw new ForbiddenException('You can only update your own appointments');
    }

    Object.assign(appointment, dto);
    return await this.repo.save(appointment);
  }

  async remove(
    id: number,
    role: string,
    email?: string,
    name?: string
  ): Promise<{ message: string }> {
    const appointment = await this.findOne(id);

    if (role === 'user' && appointment.userEmail !== email) {
      throw new ForbiddenException('You can only delete your own appointments');
    }
    
    if (role === 'staff' && appointment.providerName !== name) {
      throw new ForbiddenException('You can only delete your own appointments');
    }

    appointment.isArchived = true;
    await this.repo.save(appointment);
    
    return { message: 'Appointment deleted successfully' };
  }
 async getAppointmentsForExport(filters?: any): Promise<Appointment[]> {
  const query = this.repo.createQueryBuilder('appointment')
    .where('appointment.isArchived = :isArchived', { isArchived: false });

  if (filters?.startDate) {
    query.andWhere('appointment.datetime >= :startDate', { startDate: filters.startDate });
  }

  if (filters?.endDate) {
    query.andWhere('appointment.datetime <= :endDate', { endDate: filters.endDate });
  }

  if (filters?.status && filters.status !== 'all') {
    query.andWhere('appointment.status = :status', { status: filters.status });
  }

  return query
    .orderBy('appointment.datetime', 'DESC')
    .getMany();
}
}