import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  serviceName: string;

  @Column({ length: 100 })
  providerName: string;

  @Column({ type: 'timestamp' })
  datetime: Date;

  @Column({ nullable: true })
  userId: number;

  @Column({ length: 100 })
  userEmail: string;

  @Column({ length: 100 })
  userName: string;

  @Column({ nullable: true })
  age: number;

  @Column({ length: 10, nullable: true })
  gender: string;

  @Column({ length: 100, nullable: true })
  company: string;

  @Column({ type: 'varchar', length: 20, default: 'Normal' })
  priority: string;

  @Column({ default: true })
  forSelf: boolean;

  @Column({ length: 100, nullable: true })
  patientName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status: string;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  calendarEventId: string;

  @Column({ nullable: true })
  calendarEventLink: string;

  @Column({ nullable: true })
  meetLink: string;

  @Column({ default: false })
  calendarSynced: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.appointments)
  @JoinColumn({ name: 'userId' })
  user: User;
}