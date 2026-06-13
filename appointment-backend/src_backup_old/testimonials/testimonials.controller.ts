import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  UseGuards, 
  Request, 
  ForbiddenException,
  Query 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './testimonial.entity';
import { AuditService } from '../audit/audit.service';
import { AuditActionType, AuditStatus } from '../audit/audit.entity';

@Controller('testimonials')
@UseGuards(JwtAuthGuard)
export class TestimonialsController {
  constructor(
    @InjectRepository(Testimonial)
    private testimonialRepo: Repository<Testimonial>,
    private auditService: AuditService,
  ) {}

  /**
   * GET /api/testimonials - Get all testimonials
   * - Admin: sees all testimonials
   * - User: sees only approved testimonials
   */
  @Get()
  async getTestimonials(@Request() req) {
    if (req.user.role === 'admin') {
      return this.testimonialRepo.find({ 
        order: { createdAt: 'DESC' } 
      });
    }
    return this.testimonialRepo.find({ 
      where: { isApproved: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * GET /api/testimonials/pending - Get pending testimonials (Admin only)
   */
  @Get('pending')
  async getPendingTestimonials(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.testimonialRepo.find({ 
      where: { isApproved: false },
      order: { createdAt: 'ASC' }
    });
  }

  /**
   * GET /api/testimonials/approved - Get approved testimonials
   */
  @Get('approved')
  async getApprovedTestimonials() {
    return this.testimonialRepo.find({ 
      where: { isApproved: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * GET /api/testimonials/stats - Get testimonial statistics (Admin only)
   */
  @Get('stats')
  async getStats(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    const total = await this.testimonialRepo.count();
    const approved = await this.testimonialRepo.count({ where: { isApproved: true } });
    const pending = await this.testimonialRepo.count({ where: { isApproved: false } });
    
    const ratingResult = await this.testimonialRepo
      .createQueryBuilder('t')
      .select('AVG(t.rating)', 'average')
      .where('t.isApproved = true')
      .getRawOne();
    
    const ratingDistribution = await this.testimonialRepo
      .createQueryBuilder('t')
      .select('t.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('t.isApproved = true')
      .groupBy('t.rating')
      .orderBy('t.rating', 'DESC')
      .getRawMany();
    
    return {
      total,
      approved,
      pending,
      averageRating: parseFloat(ratingResult?.average || 0).toFixed(1),
      ratingDistribution: ratingDistribution.map(r => ({
        rating: parseInt(r.rating),
        count: parseInt(r.count)
      })),
    };
  }

  /**
   * POST /api/testimonials - Submit a new testimonial
   */
  @Post()
  async createTestimonial(
    @Body() body: { comment: string; rating?: number; appointmentId?: number },
    @Request() req
  ) {
    // Validate rating
    const rating = body.rating || 5;
    if (rating < 1 || rating > 5) {
      throw new ForbiddenException('Rating must be between 1 and 5');
    }
    
    // Validate comment
    if (!body.comment || body.comment.trim().length < 10) {
      throw new ForbiddenException('Comment must be at least 10 characters');
    }
    
    const testimonial = this.testimonialRepo.create({
      userId: req.user.userId,
      userName: req.user.name,
      userEmail: req.user.email,
      comment: body.comment.trim(),
      rating: rating,
      appointmentId: body.appointmentId,
      status: 'pending',
      isApproved: false,
    });
    
    const saved = await this.testimonialRepo.save(testimonial);
    
    await this.auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'USER_ACTION',
      description: `User ${req.user.email} submitted a testimonial`,
      status: AuditStatus.SUCCESS,
      metadata: { rating, commentLength: body.comment.length },
    });
    
    return { 
      success: true, 
      message: 'Thank you for your feedback! Your testimonial will be reviewed.',
      data: saved 
    };
  }

  /**
   * PATCH /api/testimonials/:id/approve - Approve a testimonial (Admin only)
   */
  @Patch(':id/approve')
  async approveTestimonial(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can approve testimonials');
    }
    
    const testimonial = await this.testimonialRepo.findOne({ 
      where: { id: parseInt(id) } 
    });
    
    if (!testimonial) {
      return { success: false, message: 'Testimonial not found' };
    }
    
    testimonial.isApproved = true;
    testimonial.status = 'approved';
    await this.testimonialRepo.save(testimonial);
    
    await this.auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'ADMIN_ACTION',
      description: `Admin approved testimonial from ${testimonial.userEmail}`,
      status: AuditStatus.SUCCESS,
      metadata: { testimonialId: testimonial.id },
    });
    
    return { success: true, message: 'Testimonial approved successfully' };
  }

  /**
   * PATCH /api/testimonials/:id/reject - Reject a testimonial (Admin only)
   */
  @Patch(':id/reject')
  async rejectTestimonial(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can reject testimonials');
    }
    
    const testimonial = await this.testimonialRepo.findOne({ 
      where: { id: parseInt(id) } 
    });
    
    if (!testimonial) {
      return { success: false, message: 'Testimonial not found' };
    }
    
    testimonial.status = 'rejected';
    await this.testimonialRepo.save(testimonial);
    
    await this.auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'ADMIN_ACTION',
      description: `Admin rejected testimonial from ${testimonial.userEmail}`,
      status: AuditStatus.SUCCESS,
      metadata: { testimonialId: testimonial.id },
    });
    
    return { success: true, message: 'Testimonial rejected' };
  }

  /**
   * DELETE /api/testimonials/:id - Delete a testimonial (Admin only)
   */
  @Delete(':id')
  async deleteTestimonial(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete testimonials');
    }
    
    const testimonial = await this.testimonialRepo.findOne({ 
      where: { id: parseInt(id) } 
    });
    
    if (!testimonial) {
      return { success: false, message: 'Testimonial not found' };
    }
    
    await this.testimonialRepo.delete(parseInt(id));
    
    await this.auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'ADMIN_ACTION',
      description: `Admin deleted testimonial from ${testimonial.userEmail}`,
      status: AuditStatus.SUCCESS,
      metadata: { testimonialId: id },
    });
    
    return { success: true, message: 'Testimonial deleted successfully' };
  }

  /**
   * GET /api/testimonials/user/my - Get current user's testimonials
   */
  @Get('user/my')
  async getMyTestimonials(@Request() req) {
    return this.testimonialRepo.find({ 
      where: { userId: req.user.userId },
      order: { createdAt: 'DESC' }
    });
  }
}