import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  serviceName: string;

  @Column()
  providerName: string;

  @Column()
  datetime: string;

  @Column({ nullable: true })
  age: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  company: string;

  @Column({ default: 'Normal' })
  priority: string;

  @Column({ default: true })
  forSelf: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ default: 'Pending' })
  status: string;

  @Column({ nullable: true })
  comment: string;

  @Column()
  userEmail: string;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}