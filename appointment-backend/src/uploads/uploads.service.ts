import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Upload } from './upload.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @InjectRepository(Upload)
    private uploadRepo: Repository<Upload>,
  ) {
    this.logger.log('✅ UploadsService initialized');
  }

  async create(data: {
    filename: string;
    originalName: string;
    filePath: string;
    size: number;
    mimeType: string;
    appointmentId?: number;
    userId: number;
  }): Promise<Upload> {
    try {
      this.logger.log(`📝 Creating upload record: ${data.filename}`);

      const upload = this.uploadRepo.create({
        filename: data.filename,
        originalName: data.originalName,
        filePath: data.filePath,
        size: data.size,
        mimeType: data.mimeType,
        appointmentId: data.appointmentId || null,
        userId: data.userId,
      });
      
      const saved = await this.uploadRepo.save(upload);
      this.logger.log(`✅ Upload saved with ID: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`❌ Failed to save upload: ${error.message}`);
      throw error;
    }
  }

  async findByUser(userId: number): Promise<Upload[]> {
    try {
      return await this.uploadRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`❌ Failed to find uploads for user ${userId}: ${error.message}`);
      return [];
    }
  }

  // ✅ ADD THIS METHOD (Fixes error: Property 'findOne' does not exist)
  async findOne(id: number): Promise<Upload> {
    const upload = await this.uploadRepo.findOne({ where: { id } });
    if (!upload) {
      throw new NotFoundException(`Upload with ID ${id} not found`);
    }
    return upload;
  }

  async delete(id: number, userId: number, role: string): Promise<void> {
    const upload = await this.findOne(id);
    
    if (role !== 'admin' && upload.userId !== userId) {
      throw new ForbiddenException('You can only delete your own files');
    }
    
    // ✅ Delete physical file
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadDir, upload.filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`🗑️ Deleted physical file: ${upload.filename}`);
      } else {
        this.logger.warn(`⚠️ File not found: ${upload.filename}`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ Could not delete file: ${upload.filename}`, error);
    }
    
    // ✅ Delete database record
    await this.uploadRepo.remove(upload);
    this.logger.log(`🗑️ Deleted record: ${upload.filename}`);
  }
}