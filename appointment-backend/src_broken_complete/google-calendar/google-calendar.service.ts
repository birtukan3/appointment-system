import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, calendar_v3 } from 'googleapis';
import { User } from '../users/user.entity';
import { Appointment, BookingStatus } from '../appointments/appointment.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: any;
  
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );
  }

  async getAuthUrl(userId: number): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];
    
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId.toString(),
    });
    
    this.logger.log(`Generated auth URL for user ${userId}`);
    return url;
  }

  async handleOAuthCallback(code: string, state: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      const userId = parseInt(state, 10);
      if (isNaN(userId)) {
        throw new BadRequestException('Invalid user ID in state parameter');
      }
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new BadRequestException('User not found');
      }
      
      // Store tokens
      user.googleCalendarTokens = tokens;
      user.googleCalendarConnected = true;
      
      // Get user email from Google
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = new google.auth.OAuth2();
      // const userInfo = await oauth2.userinfo.get();
      user.googleCalendarEmail = userInfo.data.email;
      
      await this.userRepository.save(user);
      
      await this.auditService.log({
        userId: userId,
        actionType: 'GOOGLE_CALENDAR_CONNECT',
        description: `User connected Google Calendar`,
        status: 'SUCCESS',
        actionDetails: { email: user.googleCalendarEmail },
      });
      
      this.logger.log(`User ${userId} connected Google Calendar`);
      
      return { success: true, message: 'Google Calendar connected successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`OAuth callback error: ${errorMessage}`);
      throw new BadRequestException('Failed to connect Google Calendar');
    }
  }

  private async getAuthenticatedClient(user: User): Promise<any> {
    if (!user.googleCalendarTokens) {
      throw new UnauthorizedException('Google Calendar not connected');
    }
    
    this.oauth2Client.setCredentials(user.googleCalendarTokens);
    
    // Check if token needs refresh
    if (this.oauth2Client.isTokenExpiring()) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        user.googleCalendarTokens = credentials;
        await this.userRepository.save(user);
        this.oauth2Client.setCredentials(credentials);
        this.logger.log(`Refreshed Google Calendar token for user ${user.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        user.googleCalendarConnected = false;
        await this.userRepository.save(user);
        this.logger.error(`Token refresh failed for user ${user.id}: ${errorMessage}`);
        throw new UnauthorizedException('Google Calendar token expired. Please reconnect.');
      }
    }
    
    const calendar = google.calendar("v3"); return calendar;
  }

  async createCalendarEvent(
    userId: number,
    appointment: Appointment,
    staffEmail?: string,
  ): Promise<string | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user || !user.googleCalendarConnected) {
        this.logger.warn(`User ${userId} has Google Calendar not connected`);
        return null;
      }
      
      const calendar = await this.getAuthenticatedClient(user);
      
      const startDateTime = new Date(appointment.datetime);
      const endDateTime = appointment.endTime ? new Date(appointment.endTime) : new Date(startDateTime.getTime() + 60 * 60 * 1000);
      
      const event: calendar_v3.Schema$Event = {
        summary: `${appointment.serviceName || 'Appointment'} - SmartOffice`,
        description: `
          Appointment Details:
          Service: ${appointment.serviceName || 'Not specified'}
          With: ${appointment.providerName || 'Staff'}
          Status: ${appointment.status}
          Notes: ${appointment.notes || 'No additional notes'}
          Booking Code: ${appointment.bookingCode}
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: this.configService.get('TIMEZONE', 'Africa/Addis_Ababa'),
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: this.configService.get('TIMEZONE', 'Africa/Addis_Ababa'),
        },
        attendees: [
          { email: user.email },
          ...(staffEmail ? [{ email: staffEmail }] : []),
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
        visibility: 'default',
        transparency: 'opaque',
      };
      
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      
      const eventId = response.data.id;
      
      // Update appointment with calendar event ID
      appointment.googleCalendarEventId = eventId;
      await this.appointmentRepository.save(appointment);
      
      await this.auditService.log({
        userId: userId,
        actionType: 'GOOGLE_CALENDAR_EVENT_CREATED',
        description: `Created Google Calendar event for appointment ${appointment.id}`,
        status: 'SUCCESS',
        entityType: 'Appointment',
        entityId: appointment.id.toString(),
        actionDetails: { eventId },
      });
      
      this.logger.log(`Created Google Calendar event for appointment ${appointment.id}`);
      
      return eventId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create calendar event: ${errorMessage}`);
      return null;
    }
  }

  async updateCalendarEvent(
    userId: number,
    appointment: Appointment,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user || !user.googleCalendarConnected || !appointment.googleCalendarEventId) {
        return;
      }
      
      const calendar = await this.getAuthenticatedClient(user);
      
      const startDateTime = new Date(appointment.datetime);
      const endDateTime = appointment.endTime ? new Date(appointment.endTime) : new Date(startDateTime.getTime() + 60 * 60 * 1000);
      
      const event: calendar_v3.Schema$Event = {
        summary: `${appointment.serviceName || 'Appointment'} - SmartOffice`,
        description: `
          Appointment Details:
          Service: ${appointment.serviceName || 'Not specified'}
          With: ${appointment.providerName || 'Staff'}
          Status: ${appointment.status}
          Notes: ${appointment.notes || 'No additional notes'}
          Booking Code: ${appointment.bookingCode}
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: this.configService.get('TIMEZONE', 'Africa/Addis_Ababa'),
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: this.configService.get('TIMEZONE', 'Africa/Addis_Ababa'),
        },
      };
      
      await calendar.events.update({
        calendarId: 'primary',
        eventId: appointment.googleCalendarEventId,
        requestBody: event,
      });
      
      await this.auditService.log({
        userId: userId,
        actionType: 'GOOGLE_CALENDAR_EVENT_UPDATED',
        description: `Updated Google Calendar event for appointment ${appointment.id}`,
        status: 'SUCCESS',
        entityType: 'Appointment',
        entityId: appointment.id.toString(),
      });
      
      this.logger.log(`Updated Google Calendar event for appointment ${appointment.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update calendar event: ${errorMessage}`);
    }
  }

  async deleteCalendarEvent(userId: number, appointment: Appointment): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user || !user.googleCalendarConnected || !appointment.googleCalendarEventId) {
        return;
      }
      
      const calendar = await this.getAuthenticatedClient(user);
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: appointment.googleCalendarEventId,
      });
      
      // Clear the event ID from appointment
      appointment.googleCalendarEventId = null;
      await this.appointmentRepository.save(appointment);
      
      await this.auditService.log({
        userId: userId,
        actionType: 'GOOGLE_CALENDAR_EVENT_DELETED',
        description: `Deleted Google Calendar event for appointment ${appointment.id}`,
        status: 'SUCCESS',
        entityType: 'Appointment',
        entityId: appointment.id.toString(),
      });
      
      this.logger.log(`Deleted Google Calendar event for appointment ${appointment.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete calendar event: ${errorMessage}`);
    }
  }

  async getAvailableSlotsFromCalendar(
    userId: number,
    staffId: number,
    date: Date,
  ): Promise<any[]> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user || !user.googleCalendarConnected) {
        return [];
      }
      
      const calendar = await this.getAuthenticatedClient(user);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = response.data.items || [];
      
      // Convert busy slots to our format
      const busySlots = events.map(event => ({
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        summary: event.summary,
      }));
      
      return busySlots;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get calendar events: ${errorMessage}`);
      return [];
    }
  }

  async disconnectCalendar(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    user.googleCalendarTokens = null;
    user.googleCalendarConnected = false;
    user.googleCalendarEmail = null;
    
    await this.userRepository.save(user);
    
    await this.auditService.log({
      userId: userId,
      actionType: 'GOOGLE_CALENDAR_DISCONNECT',
      description: `User disconnected Google Calendar`,
      status: 'SUCCESS',
    });
    
    this.logger.log(`User ${userId} disconnected Google Calendar`);
  }

  async getCalendarStatus(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }
    
    return {
      connected: user.googleCalendarConnected || false,
      email: user.googleCalendarEmail,
      connectedAt: user.googleCalendarConnected ? user.updatedAt : null,
    };
  }

  async syncCalendarEvents(userId: number): Promise<{ synced: number; message: string }> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      
      if (!user || !user.googleCalendarConnected) {
        return { synced: 0, message: 'Google Calendar not connected' };
      }
      
      // Get upcoming appointments that need syncing
      const appointments = await this.appointmentRepository.find({
        where: { 
          userId: userId, 
          googleCalendarEventId: null,
          status: BookingStatus.APPROVED
        },
        order: { datetime: 'ASC' },
        take: 50,
      });
      
      let synced = 0;
      for (const appointment of appointments) {
        const eventId = await this.createCalendarEvent(userId, appointment);
        if (eventId) synced++;
      }
      
      return { 
        synced, 
        message: `Synced ${synced} appointments to Google Calendar` 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync calendar: ${errorMessage}`);
      return { synced: 0, message: 'Failed to sync calendar' };
    }
  }
}


