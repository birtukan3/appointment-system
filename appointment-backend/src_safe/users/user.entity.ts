import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BeforeInsert, BeforeUpdate, Index } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
@Index(['email']) // Already indexed by unique, but explicit index for queries
@Index(['role', 'isActive']) // Common query filter
@Index(['googleCalendarConnected']) // For calendar sync queries
@Index(['createdAt']) // For date-based queries
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING_VERIFICATION })
  status: UserStatus;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  specialization: string;

  @Column({ nullable: true, type: 'int' })
  experience: number;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeactivated: boolean;
  
  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deactivatedAt: Date;

  @Column({ type: 'text', nullable: true })
  deactivationReason: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFailedLoginAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lockUntil: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ nullable: true })
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  // Google Calendar fields - ENHANCED
  @Column({ type: 'jsonb', nullable: true }) // Changed from 'json' to 'jsonb' for better query support
  googleCalendarTokens: {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expiry_date?: number;
  } | null;

  @Column({ default: false })
  googleCalendarConnected: boolean;

  @Column({ nullable: true })
  googleCalendarEmail: string;

  @Column({ type: 'timestamp', nullable: true })
  googleCalendarLastSyncAt: Date;

  @Column({ type: 'int', default: 0 })
  googleCalendarSyncCount: number;

  @Column({ type: 'jsonb', nullable: true })
  googleCalendarSettings: {
    autoSync?: boolean;
    syncDirection?: 'toGoogle' | 'fromGoogle' | 'both';
    defaultCalendarId?: string;
    notifyOnSync?: boolean;
  } | null;

  // Password reset fields
  @Column({ nullable: true, select: false })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetPasswordExpires: Date;

  @Column({ nullable: true, select: false })
  refreshToken: string;

  // Additional security fields
  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  lastPasswordChangeIp: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  loginHistory: Array<{
    timestamp: Date;
    ip: string;
    userAgent?: string;
    success: boolean;
  }>;

  // Notification preferences
  @Column({ type: 'jsonb', default: {
    emailNotifications: true,
    smsNotifications: false,
    calendarReminders: true,
    marketingEmails: false,
    appointmentReminders: true,
  }})
  notificationPreferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    calendarReminders: boolean;
    marketingEmails: boolean;
    appointmentReminders: boolean;
  };

  // Rate limiting fields
  @Column({ type: 'int', default: 0 })
  apiRequestCount: number;

  @Column({ type: 'timestamp', nullable: true })
  apiRequestResetAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Appointment, (appointment) => appointment.user)
  appointments: Appointment[];

  // Virtual/computed fields
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.name;
  }

  get isLocked(): boolean {
    if (!this.lockUntil) return false;
    return this.lockUntil > new Date();
  }

  get canSyncCalendar(): boolean {
    return this.googleCalendarConnected && 
           this.status === UserStatus.ACTIVE &&
           this.isActive &&
           !this.isBlocked;
  }

  // Methods
  incrementFailedLoginAttempts(): void {
    this.failedLoginAttempts++;
    this.lastFailedLoginAt = new Date();
    
    // Lock after 5 failed attempts for 15 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  resetFailedLoginAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lastFailedLoginAt = null;
    this.lockUntil = null;
  }

  recordLogin(ip: string, userAgent?: string): void {
    this.lastLoginAt = new Date();
    this.lastLoginIp = ip;
    
    if (!this.loginHistory) {
      this.loginHistory = [];
    }
    
    this.loginHistory.unshift({
      timestamp: new Date(),
      ip,
      userAgent,
      success: true,
    });
    
    // Keep only last 50 logins
    if (this.loginHistory.length > 50) {
      this.loginHistory = this.loginHistory.slice(0, 50);
    }
  }

  updateGoogleCalendarSync(): void {
    this.googleCalendarLastSyncAt = new Date();
    this.googleCalendarSyncCount++;
  }

  disconnectGoogleCalendar(): void {
    this.googleCalendarTokens = null;
    this.googleCalendarConnected = false;
    this.googleCalendarEmail = null;
    this.googleCalendarLastSyncAt = null;
    this.googleCalendarSyncCount = 0;
  }

  // Lifecycle hooks
  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  @BeforeInsert()
  setDefaultStatus() {
    if (!this.status) {
      this.status = this.emailVerified ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION;
    }
  }

  @BeforeUpdate()
  updateStatusBasedOnFlags() {
    if (this.isBlocked) {
      this.status = UserStatus.BLOCKED;
    } else if (!this.isActive || this.isDeactivated) {
      this.status = UserStatus.INACTIVE;
    } else if (!this.emailVerified) {
      this.status = UserStatus.PENDING_VERIFICATION;
    } else if (this.status === UserStatus.BLOCKED && !this.isBlocked) {
      this.status = UserStatus.ACTIVE;
    }
  }
}