import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============ LIMITS ============
  @Column({ type: 'int', default: 3 })
  dailyLimit: number;

  @Column({ type: 'int', default: 10 })
  weeklyLimit: number;

  @Column({ type: 'int', default: 30 })
  monthlyLimit: number;

  @Column({ type: 'int', default: 3 })
  activeLimit: number;

  @Column({ type: 'int', default: 5 })
  cooldownMinutes: number;

  @Column({ type: 'int', default: 30 })
  autoArchiveDays: number;

  @Column({ type: 'int', default: 3 })
  maxBookingsPerDay: number;

  // ============ FEATURES ============
  @Column({ type: 'boolean', default: false })
  maintenanceMode: boolean;

  @Column({ type: 'boolean', default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  allowGuestBookings: boolean;

  @Column({ type: 'boolean', default: true })
  requireEmailVerification: boolean;

  @Column({ type: 'boolean', default: true })
  enableGoogleCalendarSync: boolean;

  @Column({ type: 'boolean', default: false })
  enableTwoFactorAuth: boolean;

  // ============ BUSINESS HOURS ============
  @Column({ type: 'int', default: 9 })
  businessStartHour: number;

  @Column({ type: 'int', default: 18 })
  businessEndHour: number;

  @Column({ type: 'jsonb', default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] })
  workingDays: string[];

  // ============ NOTIFICATIONS ============
  @Column({ type: 'jsonb', default: {
    bookingConfirmation: true,
    appointmentReminder: true,
    statusUpdate: true,
    adminAlert: true,
    emailNotifications: true,
    smsNotifications: false,
  }})
  notificationSettings: {
    bookingConfirmation: boolean;
    appointmentReminder: boolean;
    statusUpdate: boolean;
    adminAlert: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };

  // ============ SYSTEM ============
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}