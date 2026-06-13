import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_APPROVED = 'appointment_approved',
  APPOINTMENT_REJECTED = 'appointment_rejected',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  APPOINTMENT_EXPIRED = 'appointment_expired',
  APPROVAL_CODE_RECEIVED = 'approval_code_received',
  FILE_UPLOADED = 'file_uploaded',
  STAFF_CREATED = 'staff_created',
  STAFF_DELETED = 'staff_deleted',
  ANNOUNCEMENT = 'announcement',
  SYSTEM_ALERT = 'system_alert',
  MESSAGE = 'message',
  FEEDBACK_RECEIVED = 'feedback_received',
}

@Entity('notifications')
@Index(['userId'])
@Index(['read'])
@Index(['createdAt'])
@Index(['userId', 'read'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  appointmentId: number;

  @Column({ nullable: true })
  actionUrl: string;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}