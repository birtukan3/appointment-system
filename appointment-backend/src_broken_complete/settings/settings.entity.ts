import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'boolean', default: false })
  maintenanceMode: boolean;

  @Column({ type: 'boolean', default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}