// backend/src/uploads/uploads.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './upload.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(Upload)
    private uploadRepo: Repository<Upload>,
  ) {}

  async create(data: {
    filename: string;
    originalName: string;
    filePath: string;
    size: number;
    mimeType: string;
    appointmentId?: number;
    userId: number;
  }) {
    const upload = this.uploadRepo.create({
      filename: data.filename,
      originalName: data.originalName,
      filePath: data.filePath,
      size: data.size,
      mimeType: data.mimeType,
      appointmentId: data.appointmentId || null,
      userId: data.userId,
    });
    return this.uploadRepo.save(upload);
  }

  async findByUser(userId: number): Promise<Upload[]> {
    return this.uploadRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: number, userId: number, role: string): Promise<void> {
    const upload = await this.uploadRepo.findOne({ where: { id } });
    
    if (!upload) {
      throw new NotFoundException('File not found');
    }
    
    if (role !== 'admin' && upload.userId !== userId) {
      throw new ForbiddenException('You can only delete your own files');
    }
    
    const filePath = path.join(process.cwd(), upload.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await this.uploadRepo.remove(upload);
  }
}