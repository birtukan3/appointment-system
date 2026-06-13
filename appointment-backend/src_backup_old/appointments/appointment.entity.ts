import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from '../users/user.entity';

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  CHECKED_IN = 'checked_in',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled'
}

export enum BookingPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

export enum AppointmentSource {
  WEB = 'web',
  MOBILE = 'mobile',
  ADMIN = 'admin',
  API = 'api',
  GOOGLE_CALENDAR = 'google_calendar',
  WALK_IN = 'walk_in'
}

@Entity('appointments')
@Index(['userEmail'])
@Index(['status'])
@Index(['datetime'])
@Index(['providerName'])
@Index(['bookingCode'])
@Index(['approvalCode'])
@Index(['userId', 'status'])
@Index(['providerId', 'datetime']) // For staff schedule queries
@Index(['googleCalendarEventId']) // For Google Calendar sync lookups
@Index(['createdAt']) // For reporting queries
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  // ============ CODES & IDENTIFIERS ============
  @Column({ unique: true, nullable: true })
  bookingCode: string;

  @Column({ unique: true, nullable: true })
  approvalCode: string;

  @Column({ unique: true, nullable: true })
  verificationCode: string;

  @Column({ type: 'text', nullable: true })
  qrCodeData: string;

  @Column({ type: 'uuid', nullable: true, unique: true })
  publicUuid: string;

  // ============ SERVICE INFORMATION ============
  @Column()
  serviceName: string;

  @Column()
  providerName: string;

  @Column({ nullable: true })
  providerId: number;

  @Column({ type: 'timestamp' })
  datetime: Date;

  @Column({ nullable: true, type: 'timestamp' })
  endTime: Date;

  @Column({ nullable: true, type: 'timestamp' })
  bufferEndTime: Date;

  // ============ USER INFORMATION ============
  @Column({ nullable: true })
  userId: number;

  @Column()
  userEmail: string;

  @Column()
  userName: string;

  @Column({ nullable: true })
  userPhone: string;

  // ============ NOTES & COMMENTS ============
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'text', nullable: true })
  staffNotes: string;

  // ============ STATUS & PRIORITY ============
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ type: 'enum', enum: BookingPriority, default: BookingPriority.NORMAL })
  priority: BookingPriority;

  @Column({ type: 'enum', enum: AppointmentSource, default: AppointmentSource.WEB })
  source: AppointmentSource;

  // ============ FLAGS ============
  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: false })
  isExpired: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isWalkIn: boolean;

  @Column({ default: false })
  requiresFollowUp: boolean;

  @Column({ default: false })
  followUpCompleted: boolean;

  // ============ DURATION & PATIENT INFO ============
  @Column({ default: 60 })
  duration: number;

  @Column({ default: true })
  forSelf: boolean;

  @Column({ nullable: true })
  patientName: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  patientEmail: string;

  @Column({ nullable: true })
  patientPhone: string;

  @Column({ nullable: true })
  relationshipToPatient: string;

  // ============ TIMESTAMPS ============
  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  noShowAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  // ============ REASONS ============
  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true })
  noShowReason: string;

  // ============ REMINDERS ============
  @Column({ type: 'boolean', default: false })
  reminderSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt: Date;

  @Column({ type: 'boolean', default: false })
  smsReminderSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  smsReminderSentAt: Date;

  @Column({ type: 'boolean', default: false })
  emailReminderSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailReminderSentAt: Date;

  @Column({ type: 'boolean', default: false })
  reminder1DaySent: boolean;

  @Column({ type: 'boolean', default: false })
  reminder1HourSent: boolean;

  // ============ GOOGLE CALENDAR ============
  @Column({ nullable: true })
  googleEventId: string;

  @Column({ nullable: true })
  googleCalendarEventId: string;

  @Column({ type: 'timestamp', nullable: true })
  googleCalendarSyncedAt: Date;

  @Column({ type: 'boolean', default: false })
  googleCalendarSyncFailed: boolean;

  @Column({ type: 'text', nullable: true })
  googleCalendarSyncError: string;

  @Column({ nullable: true })
  meetingLink: string;

  @Column({ nullable: true })
  conferenceData: string;

  // ============ FEEDBACK ============
  @Column({ default: false })
  feedbackGiven: boolean;

  @Column({ nullable: true, type: 'int' })
  feedbackRating: number;

  @Column({ type: 'text', nullable: true })
  feedbackComment: string;

  @Column({ nullable: true, type: 'timestamp' })
  feedbackDate: Date;

  // ============ RESCHEDULE INFO ============
  @Column({ default: 0 })
  rescheduleCount: number;

  @Column({ type: 'timestamp', nullable: true })
  originalDatetime: Date;

  @Column({ type: 'text', nullable: true })
  rescheduleReason: string;

  @Column({ nullable: true })
  rescheduledBy: string;

  @Column({ type: 'timestamp', nullable: true })
  lastRescheduledAt: Date;

  // ============ WAITLIST INFO ============
  @Column({ default: false })
  isWaitlisted: boolean;

  @Column({ type: 'int', nullable: true })
  waitlistPosition: number;

  @Column({ type: 'timestamp', nullable: true })
  waitlistedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  waitlistNotifiedAt: Date;

  // ============ ATTACHMENTS ============
  @Column({ type: 'json', nullable: true })
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: string;
  }>;

  // ============ CHECK-IN INFO ============
  @Column({ nullable: true })
  checkedInBy: string;

  @Column({ type: 'int', default: 0 })
  waitingMinutes: number;

  @Column({ type: 'timestamp', nullable: true })
  checkInTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOutTime: Date;

  // ============ METADATA ============
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  // ============ IP & DEVICE TRACKING ============
  @Column({ nullable: true })
  createdIp: string;

  @Column({ nullable: true })
  userAgent: string;

  // ============ RELATIONSHIPS ============
  @ManyToOne(() => User, (user) => user.appointments, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  // ============ TIMESTAMPS ============
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============ HOOKS ============
  @BeforeInsert()
  @BeforeUpdate()
  generateBookingCodeIfNeeded() {
    if (!this.bookingCode) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.bookingCode = `BK-${timestamp}-${random}`;
    }
  }

  @BeforeInsert()
  generateApprovalCodeIfNeeded() {
    if (!this.approvalCode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      this.approvalCode = code;
    }
  }

  @BeforeInsert()
  generateVerificationCodeIfNeeded() {
    if (!this.verificationCode) {
      this.verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }
  }

  @BeforeInsert()
  generatePublicUuidIfNeeded() {
    if (!this.publicUuid) {
      this.publicUuid = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  }

  @BeforeInsert()
  setEndTimeIfNotSet() {
    if (!this.endTime && this.datetime) {
      this.endTime = new Date(new Date(this.datetime).getTime() + this.duration * 60000);
    }
  }

  @BeforeUpdate()
  updateStatusTimestamps() {
    if (this.status === BookingStatus.APPROVED && !this.approvedAt) {
      this.approvedAt = new Date();
    }
    if (this.status === BookingStatus.REJECTED && !this.rejectedAt) {
      this.rejectedAt = new Date();
    }
    if (this.status === BookingStatus.CANCELLED && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
    if (this.status === BookingStatus.COMPLETED && !this.completedAt) {
      this.completedAt = new Date();
    }
    if (this.status === BookingStatus.CHECKED_IN && !this.checkedInAt) {
      this.checkedInAt = new Date();
    }
    if (this.status === BookingStatus.EXPIRED && !this.expiredAt) {
      this.expiredAt = new Date();
    }
    if (this.status === BookingStatus.NO_SHOW && !this.noShowAt) {
      this.noShowAt = new Date();
    }
  }

  @BeforeUpdate()
  checkExpiration() {
    if (!this.isExpired && this.datetime && new Date() > this.datetime) {
      this.isExpired = true;
      if (this.status === BookingStatus.APPROVED || this.status === BookingStatus.PENDING) {
        this.status = BookingStatus.EXPIRED;
        this.expiredAt = new Date();
      }
    }
  }

  @BeforeUpdate()
  updateWaitingTime() {
    if (this.checkedInAt && !this.startedAt) {
      const now = new Date();
      const waitTime = Math.floor((now.getTime() - this.checkedInAt.getTime()) / (1000 * 60));
      if (waitTime > this.waitingMinutes) {
        this.waitingMinutes = waitTime;
      }
    }
  }

  @BeforeUpdate()
  trackReschedule() {
    if (this.originalDatetime && !this.lastRescheduledAt) {
      this.lastRescheduledAt = new Date();
    }
  }

  // ============ COMPUTED PROPERTIES ============
  get isUpcoming(): boolean {
    return this.datetime > new Date() && 
           [BookingStatus.PENDING, BookingStatus.APPROVED].includes(this.status);
  }

  get isPast(): boolean {
    return this.datetime < new Date() || this.completedAt !== null;
  }

  get isOverdue(): boolean {
    return this.isUpcoming === false && 
           this.status === BookingStatus.PENDING && 
           this.datetime < new Date();
  }

  get canBeCancelled(): boolean {
    const now = new Date();
    const appointmentTime = new Date(this.datetime);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilAppointment > 2 && 
           [BookingStatus.PENDING, BookingStatus.APPROVED].includes(this.status);
  }

  get googleCalendarEventUrl(): string | null {
    if (!this.googleCalendarEventId) return null;
    return `https://calendar.google.com/calendar/r/eventedit/${this.googleCalendarEventId}`;
  }

  // ============ METHODS ============
  markAsStarted(): void {
    this.startedAt = new Date();
    if (!this.checkedInAt) {
      this.checkedInAt = this.startedAt;
    }
  }

  markAsCompleted(): void {
    this.status = BookingStatus.COMPLETED;
    this.completedAt = new Date();
  }

  markAsNoShow(reason?: string): void {
    this.status = BookingStatus.NO_SHOW;
    this.noShowAt = new Date();
    if (reason) this.noShowReason = reason;
  }

  reschedule(newDateTime: Date, reason?: string, rescheduledBy?: string): void {
    if (!this.originalDatetime) {
      this.originalDatetime = this.datetime;
    }
    this.datetime = newDateTime;
    this.rescheduleCount++;
    this.rescheduleReason = reason || 'Rescheduled by user';
    this.rescheduledBy = rescheduledBy;
    this.lastRescheduledAt = new Date();
    this.status = BookingStatus.RESCHEDULED;
  }

  addAttachment(name: string, url: string, type: string, size: number, uploadedBy: string): void {
    if (!this.attachments) this.attachments = [];
    this.attachments.push({
      id: Math.random().toString(36).substring(7),
      name,
      url,
      type,
      size,
      uploadedAt: new Date(),
      uploadedBy
    });
  }

  removeAttachment(attachmentId: string): void {
    if (this.attachments) {
      this.attachments = this.attachments.filter(a => a.id !== attachmentId);
    }
  }

  addFeedback(rating: number, comment: string): void {
    this.feedbackGiven = true;
    this.feedbackRating = rating;
    this.feedbackComment = comment;
    this.feedbackDate = new Date();
  }
}