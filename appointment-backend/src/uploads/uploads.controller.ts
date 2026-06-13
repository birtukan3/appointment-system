// backend/src/uploads/uploads.controller.ts
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any, @Request() req, @Body() body: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only images and PDF files are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${random}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const savedFile = await this.uploadsService.create({
      filename,
      originalName: file.originalname,
      filePath,
      size: file.size,
      mimeType: file.mimetype,
      userId: req.user.userId,
      appointmentId: body.appointmentId ? parseInt(body.appointmentId) : null,
    });

    return {
      success: true,
      message: 'File uploaded successfully',
      data: savedFile
    };
  }

  @Get()
  async getUserFiles(@Request() req) {
    const files = await this.uploadsService.findByUser(req.user.userId);
    return { success: true, data: files };
  }

  @Get('user')
  async getUserFilesAlt(@Request() req) {
    const files = await this.uploadsService.findByUser(req.user.userId);
    return { success: true, data: files };
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Request() req) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException('Invalid file ID');
    }
    await this.uploadsService.delete(numericId, req.user.userId, req.user.role);
    return { success: true, message: 'File deleted successfully' };
  }
}