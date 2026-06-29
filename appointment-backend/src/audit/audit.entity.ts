import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export enum AuditActionType {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  REGISTER = 'REGISTER',
  CREATE_USER = 'CREATE_USER',
  DELETE_USER = 'DELETE_USER',
  
  // Appointments
  CREATE_APPOINTMENT = 'CREATE_APPOINTMENT',
  UPDATE_APPOINTMENT = 'UPDATE_APPOINTMENT',
  DELETE_APPOINTMENT = 'DELETE_APPOINTMENT',
  APPROVE_APPOINTMENT = 'APPROVE_APPOINTMENT',
  REJECT_APPOINTMENT = 'REJECT_APPOINTMENT',
  APPROVE_WITH_CODE = 'APPROVE_WITH_CODE',
  ARCHIVE_APPOINTMENTS = 'ARCHIVE_APPOINTMENTS',
  BULK_ACTION = 'BULK_ACTION',
  
  // Staff Management
  CREATE_STAFF = 'CREATE_STAFF',
  DELETE_STAFF = 'DELETE_STAFF',
  UPDATE_STAFF = 'UPDATE_STAFF',
  
  // User Actions
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  UPLOAD_FILE = 'UPLOAD_FILE',
  DELETE_FILE = 'DELETE_FILE',
  
  // System
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',  // ✅ ADD THIS
  SEND_ANNOUNCEMENT = 'SEND_ANNOUNCEMENT',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  EXPORT_DATA = 'EXPORT_DATA',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  
  // Feedback & Testimonials
  SUBMIT_FEEDBACK = 'SUBMIT_FEEDBACK',
  APPROVE_TESTIMONIAL = 'APPROVE_TESTIMONIAL',
  REJECT_TESTIMONIAL = 'REJECT_TESTIMONIAL',
  
  // Google Calendar
  GOOGLE_CALENDAR_CONNECT = 'GOOGLE_CALENDAR_CONNECT',
  GOOGLE_CALENDAR_DISCONNECT = 'GOOGLE_CALENDAR_DISCONNECT',
  GOOGLE_CALENDAR_SYNC = 'GOOGLE_CALENDAR_SYNC',
  
  // Role-based
  ADMIN_ACTION = 'ADMIN_ACTION',
  STAFF_ACTION = 'STAFF_ACTION',
  USER_ACTION = 'USER_ACTION',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
}

@Entity('audit_logs')
@Index(['userId'])
@Index(['actionType'])
@Index(['timestamp'])
@Index(['status'])
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', nullable: true })
  userEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  userName: string | null;

  @Column({ type: 'varchar', nullable: true })
  userRole: string | null;

  @Column({ type: 'varchar', nullable: true })
  actionType: string | null;

  // ✅ FIXED: Use 'metadata' instead of 'actionDetails' (or both)
  @Column({ type: 'json', nullable: true })
  actionDetails: any;  // ✅ Keep for backward compatibility

  @Column({ type: 'json', nullable: true })
  metadata: any;  // ✅ ADD THIS for new code

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', default: AuditStatus.SUCCESS })
  status: string;

  @Column({ type: 'varchar', nullable: true })
  entityType: string | null;

  @Column({ type: 'varchar', nullable: true })
  entityId: string | null;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;
}