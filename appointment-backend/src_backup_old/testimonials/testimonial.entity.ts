import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('testimonials')
@Index(['isApproved'])
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
export class Testimonial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 255 })
  userName: string;

  @Column({ type: 'varchar', length: 255 })
  userEmail: string;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ type: 'int', nullable: true })
  appointmentId: number;

  @Column({ type: 'text', nullable: true })
  adminComment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}