import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHECKED_IN = 'checked_in',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

export enum BookingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

@Entity('appointments')
@Index(['userId'])
@Index(['status'])
@Index(['datetime'])
@Index(['providerName'])
@Index(['bookingCode'])
@Index(['approvalCode'])
@Index(['verificationCode'])
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  serviceName: string;

  @Column()
  providerName: string;

  @Column()
  datetime: Date;

  @Column()
  userId: number;

  @Column()
  userEmail: string;

  @Column()
  userName: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: BookingPriority, default: BookingPriority.NORMAL })
  priority: BookingPriority;

  @Column({ default: 60 })
  duration: number;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ nullable: true, unique: true })
  bookingCode: string;

  @Column({ nullable: true, unique: true })
  approvalCode: string;

  @Column({ nullable: true, unique: true })
  verificationCode: string;

  @Column({ nullable: true, type: 'text' })
  qrCodeData: string;

  @Column({ default: false })
  isExpired: boolean;

  @Column({ nullable: true })
  expiredAt: Date;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  archivedAt: Date;

  @Column({ nullable: true })
  checkedInAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true, type: 'text' })
  cancellationReason: string;

  @Column({ default: false })
  reminderSent: boolean;

  @Column({ default: false })
  feedbackGiven: boolean;

  @Column({ type: 'int', nullable: true })
  feedbackRating: number;

  @Column({ nullable: true, type: 'text' })
  feedbackComment: string;

  @Column({ nullable: true })
  feedbackDate: Date;

  @Column({ nullable: true })
  googleCalendarEventId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.appointments)
  @JoinColumn({ name: 'userId' })
  user: User;
}