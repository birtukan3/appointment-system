import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ unique: true, length: 255, nullable: false })
  email: string;

  @Column({ length: 60, nullable: false })
  password: string;

  @Column({ default: 'user', length: 20 })
  role: string;

  @Column({ nullable: true, length: 100 })
  company: string;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ nullable: true, length: 10 })
  countryCode: string;

  @Column({ nullable: true, length: 100 })
  department: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}