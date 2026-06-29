import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  Body,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { Upload } from './upload.entity';
import * as fs from 'fs';
import * as path from 'path';

// ✅ FIX: Use 'any' type for file to avoid Express.Multer error
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,  // ✅ FIXED: Changed from Express.Multer.File to any
    @Request() req: any,
    @Body() body: any
  ): Promise<{ success: boolean; message: string; data?: Upload }> {
    try {
      this.logger.log('📤 Upload request received');

      if (!file) {
        throw new BadRequestException('No file uploaded. Please select a file.');
      }

      this.logger.log(`📄 File: ${file.originalname}, Size: ${file.size} bytes, Type: ${file.mimetype}`);

      // ✅ Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
        );
      }

      // ✅ Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException(`File size must be less than 10MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }

      // ✅ Ensure uploads directory exists
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        this.logger.log('📁 Created uploads directory');
      }

      // ✅ Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const filename = `${timestamp}-${random}${ext}`;
      const filePath = path.join(uploadDir, filename);

      // ✅ Save file to disk
      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`💾 File saved: ${filename}`);

      // ✅ Get user ID
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      // ✅ Save to database
      const savedFile = await this.uploadsService.create({
        filename,
        originalName: file.originalname,
        filePath: filePath,
        size: file.size,
        mimeType: file.mimetype,
        userId: userId,
        appointmentId: body.appointmentId ? parseInt(body.appointmentId) : null,
      });

      this.logger.log(`✅ File uploaded successfully: ${savedFile.id}`);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: savedFile
      };
    } catch (error) {
      this.logger.error(`❌ Upload error: ${error.message}`);
      return {
        success: false,
        message: error.message || 'File upload failed. Please try again.'
      };
    }
  }

  @Get()
  async getUserFiles(@Request() req: any): Promise<{ success: boolean; data: Upload[]; message?: string }> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return { success: false, message: 'User not authenticated', data: [] };
      }
      const files = await this.uploadsService.findByUser(userId);
      return { success: true, data: files };
    } catch (error) {
      this.logger.error(`❌ Get files error: ${error.message}`);
      return { success: false, message: 'Failed to get files', data: [] };
    }
  }

  @Get('user')
  async getUserFilesAlt(@Request() req: any): Promise<{ success: boolean; data: Upload[]; message?: string }> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return { success: false, message: 'User not authenticated', data: [] };
      }
      const files = await this.uploadsService.findByUser(userId);
      return { success: true, data: files };
    } catch (error) {
      this.logger.error(`❌ Get files error: ${error.message}`);
      return { success: false, message: 'Failed to get files', data: [] };
    }
  }

  @Get(':id')
  async getFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<{ success: boolean; data?: Upload; message?: string }> {
    try {
      const file = await this.uploadsService.findOne(id);
      const userId = req.user?.userId || req.user?.id;
      
      if (file.userId !== userId && req.user?.role !== 'admin') {
        return { success: false, message: 'You do not have access to this file' };
      }
      
      return { success: true, data: file };
    } catch (error) {
      this.logger.error(`❌ Get file error: ${error.message}`);
      return { success: false, message: error.message || 'Failed to get file' };
    }
  }

  @Delete(':id')
  async deleteFile(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return { success: false, message: 'User not authenticated' };
      }
      await this.uploadsService.delete(id, userId, req.user?.role);
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      this.logger.error(`❌ Delete file error: ${error.message}`);
      return { success: false, message: error.message || 'Failed to delete file' };
    }
  }
}