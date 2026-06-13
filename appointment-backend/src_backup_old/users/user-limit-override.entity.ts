import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_limit_overrides')
export class UserLimitOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  userId: number;

  @Column({ type: 'int', nullable: true })
  dailyLimit: number | null;

  @Column({ type: 'int', nullable: true })
  weeklyLimit: number | null;

  @Column({ type: 'int', nullable: true })
  monthlyLimit: number | null;

  @Column({ type: 'int', nullable: true })
  activeLimit: number | null;

  @Column({ type: 'boolean', default: false })
  isVIP: boolean;

  @Column({ type: 'boolean', default: false })
  unlimited: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}