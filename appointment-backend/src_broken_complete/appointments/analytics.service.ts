import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, BookingStatus, BookingPriority } from './appointment.entity';
import { subDays, subWeeks, subMonths, format, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Appointment)
    private repo: Repository<Appointment>,
  ) {}

  async getAdminAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = { isArchived: false };
    if (startDate && endDate) {
      where.datetime = Between(startDate, endDate);
    }
    const appointments = await this.repo.find({ where });
    return this.processAnalytics(appointments);
  }

  async getUserAnalytics(userId: number) {
    const appointments = await this.repo.find({ 
      where: { userId, isArchived: false } 
    });
    return this.processAnalytics(appointments);
  }

  async getStaffAnalytics(staffName: string) {
    const appointments = await this.repo.find({ 
      where: { providerName: staffName, isArchived: false } 
    });
    return this.processAnalytics(appointments);
  }

  async getProviderAnalytics(providerName: string) {
    const appointments = await this.repo.find({ 
      where: { providerName, isArchived: false } 
    });
    return this.processAnalytics(appointments);
  }

  async getDashboardStats() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = subDays(now, 7);
    const monthStart = subDays(now, 30);

    const [total, today, thisWeek, thisMonth, pending, approved, rejected] = await Promise.all([
      this.repo.count({ where: { isArchived: false } }),
      this.repo.count({ where: { datetime: Between(todayStart, now), isArchived: false } }),
      this.repo.count({ where: { datetime: Between(weekStart, now), isArchived: false } }),
      this.repo.count({ where: { datetime: Between(monthStart, now), isArchived: false } }),
      this.repo.count({ where: { status: BookingStatus.PENDING, isArchived: false } }),
      this.repo.count({ where: { status: BookingStatus.APPROVED, isArchived: false } }),
      this.repo.count({ where: { status: BookingStatus.REJECTED, isArchived: false } }),
    ]);

    return { total, today, thisWeek, thisMonth, pending, approved, rejected };
  }

  private processAnalytics(appointments: Appointment[]) {
    const last7Days = [...Array(7)].map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    const dailyData = last7Days.map(date => ({
      date: format(new Date(date), 'MMM dd'),
      appointments: appointments.filter(a => a.datetime?.toISOString().startsWith(date)).length,
      approved: appointments.filter(a => a.datetime?.toISOString().startsWith(date) && a.status === BookingStatus.APPROVED).length,
      pending: appointments.filter(a => a.datetime?.toISOString().startsWith(date) && a.status === BookingStatus.PENDING).length,
      rejected: appointments.filter(a => a.datetime?.toISOString().startsWith(date) && a.status === BookingStatus.REJECTED).length,
      completed: appointments.filter(a => a.datetime?.toISOString().startsWith(date) && a.status === BookingStatus.COMPLETED).length,
      expired: appointments.filter(a => a.datetime?.toISOString().startsWith(date) && a.status === BookingStatus.EXPIRED).length,
    }));

    const weeklyData = [...Array(4)].map((_, i) => {
      const weekStart = subWeeks(new Date(), 3 - i);
      const weekEnd = subWeeks(new Date(), 2 - i);
      const weekApps = appointments.filter(a => {
        const appDate = new Date(a.datetime);
        return appDate >= weekStart && appDate < weekEnd;
      });
      return {
        week: `Week ${4 - i}`,
        total: weekApps.length,
        approved: weekApps.filter(a => a.status === BookingStatus.APPROVED).length,
        pending: weekApps.filter(a => a.status === BookingStatus.PENDING).length,
        rejected: weekApps.filter(a => a.status === BookingStatus.REJECTED).length,
        completionRate: weekApps.length > 0 
          ? Math.round((weekApps.filter(a => a.status === BookingStatus.APPROVED).length / weekApps.length) * 100)
          : 0,
      };
    });

    const monthlyData = [...Array(6)].map((_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const monthApps = appointments.filter(a => {
        const appDate = new Date(a.datetime);
        return appDate >= monthStart && appDate <= monthEnd;
      });
      return {
        month: format(date, 'MMM'),
        total: monthApps.length,
        approved: monthApps.filter(a => a.status === BookingStatus.APPROVED).length,
        pending: monthApps.filter(a => a.status === BookingStatus.PENDING).length,
        rejected: monthApps.filter(a => a.status === BookingStatus.REJECTED).length,
      };
    });

    const statusDistribution = {
      approved: appointments.filter(a => a.status === BookingStatus.APPROVED).length,
      pending: appointments.filter(a => a.status === BookingStatus.PENDING).length,
      rejected: appointments.filter(a => a.status === BookingStatus.REJECTED).length,
      expired: appointments.filter(a => a.status === BookingStatus.EXPIRED).length,
      completed: appointments.filter(a => a.status === BookingStatus.COMPLETED).length,
      cancelled: appointments.filter(a => a.status === BookingStatus.CANCELLED).length,
      archived: appointments.filter(a => a.status === BookingStatus.ARCHIVED).length,
      checkedIn: appointments.filter(a => a.status === BookingStatus.CHECKED_IN).length,
    };

    const priorityDistribution = {
      urgent: appointments.filter(a => a.priority === BookingPriority.URGENT).length,
      high: appointments.filter(a => a.priority === BookingPriority.HIGH).length,
      normal: appointments.filter(a => !a.priority || a.priority === BookingPriority.NORMAL).length,
      low: appointments.filter(a => a.priority === BookingPriority.LOW).length,
    };

    const total = appointments.length;
    const completed = appointments.filter(a => a.status === BookingStatus.APPROVED || a.status === BookingStatus.COMPLETED).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const providerStats: Record<string, { total: number; approved: number; pending: number; rejected: number }> = {};
    appointments.forEach(app => {
      if (!providerStats[app.providerName]) {
        providerStats[app.providerName] = { total: 0, approved: 0, pending: 0, rejected: 0 };
      }
      providerStats[app.providerName].total++;
      if (app.status === BookingStatus.APPROVED) providerStats[app.providerName].approved++;
      if (app.status === BookingStatus.PENDING) providerStats[app.providerName].pending++;
      if (app.status === BookingStatus.REJECTED) providerStats[app.providerName].rejected++;
    });

    const providerPerformance = Object.entries(providerStats).map(([name, stats]) => ({
      name,
      total: stats.total,
      approved: stats.approved,
      pending: stats.pending,
      rejected: stats.rejected,
      approvalRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
    })).sort((a, b) => b.approvalRate - a.approvalRate);

    const hourlyData = Array(24).fill(0).map((_, hour) => ({
      hour: `${hour}:00`,
      appointments: appointments.filter(a => new Date(a.datetime).getHours() === hour).length,
    }));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayData = dayNames.map((day, index) => ({
      day,
      appointments: appointments.filter(a => new Date(a.datetime).getDay() === index).length,
    }));

    return {
      dailyData,
      weeklyData,
      monthlyData,
      statusDistribution,
      priorityDistribution,
      providerPerformance,
      hourlyData,
      weekdayData,
      completionRate,
      totalAppointments: total,
    };
  }
}