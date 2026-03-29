import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';

type CalendarEventResult = {
  eventId?: string | null;
  eventLink?: string | null;
  meetLink?: string | null;
  synced: boolean;
};

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private isInitialized = false;

  async onModuleInit() {
    await this.initializeOAuthClient();
  }

  private async initializeOAuthClient() {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        this.logger.warn('Google Calendar credentials not configured. Calendar sync is disabled.');
        this.isInitialized = false;
        return;
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
      );

      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        this.oauth2Client.on('tokens', (tokens) => {
          if (tokens.refresh_token) {
            this.logger.log('Received new refresh token');
          }
          this.logger.log('Access token refreshed');
        });

        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          this.isInitialized = true;
          this.logger.log('Google Calendar client initialized and connected');
        } catch (refreshError) {
          this.logger.error('Failed to refresh access token:', refreshError.message);
          this.isInitialized = false;
        }
      } else {
        this.logger.warn('Google Refresh Token not configured. Authentication required.');
        this.isInitialized = false;
      }
      
    } catch (error) {
      this.logger.error('Failed to initialize Google Calendar client:', error.message);
      this.isInitialized = false;
    }
  }

  private async ensureAuthenticated() {
    if (!this.isInitialized) {
      await this.initializeOAuthClient();
      
      if (!this.isInitialized) {
        throw new Error('Google Calendar service is not properly configured');
      }
    }

    try {
      const credentials = this.oauth2Client.credentials;
      if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
        this.logger.log('Access token expired, refreshing...');
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(newCredentials);
      }
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.message);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  async checkAvailability(staffEmail: string, startTime: Date, durationMinutes: number): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return true;
      }

      await this.ensureAuthenticated();

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: staffEmail }],
        },
      });

      const busyTimes = response.data.calendars[staffEmail]?.busy || [];
      const isAvailable = busyTimes.length === 0;
      
      this.logger.log(`Availability check for ${staffEmail}: ${isAvailable ? 'Available' : 'Busy'}`);
      
      return isAvailable;
    } catch (error) {
      this.logger.error('Failed to check availability:', error);
      return true;
    }
  }

  async getBusySlots(staffEmail: string, date: string, durationMinutes: number = 60): Promise<string[]> {
    try {
      if (!this.isInitialized) {
        return [];
      }

      await this.ensureAuthenticated();

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: staffEmail }],
        },
      });

      const busyTimes = response.data.calendars[staffEmail]?.busy || [];
      
      const busySlots = busyTimes.map(busy => {
        const start = new Date(busy.start);
        return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
      });
      
      return busySlots;
    } catch (error) {
      this.logger.error('Failed to get busy slots:', error);
      return [];
    }
  }

  async createCalendarEvent(
    appointment: any,
    staffEmail?: string,
    durationMinutes: number = 60,
  ): Promise<CalendarEventResult> {
    try {
      if (!this.isInitialized) {
        return this.getUnavailableEventData();
      }

      await this.ensureAuthenticated();

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const startTime = new Date(appointment.datetime);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const event = {
        summary: `Appointment: ${appointment.serviceName || 'Service'}`,
        description: this.formatEventDescription(appointment),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: this.getAttendees(appointment.userEmail, staffEmail),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const eventWithConference = {
        ...event,
        conferenceData: {
          createRequest: {
            requestId: `appointment-${appointment.id || Date.now()}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventWithConference,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });

      return {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        meetLink: response.data.hangoutLink || null,
        synced: true,
      };
    } catch (error) {
      this.logger.error('Failed to create calendar event:', error.message);
      return this.getUnavailableEventData();
    }
  }

  async updateCalendarEvent(
    eventId: string,
    appointment: any,
    staffEmail?: string,
    durationMinutes: number = 60,
  ): Promise<CalendarEventResult> {
    try {
      if (!this.isInitialized) {
        return { eventId, synced: false };
      }

      await this.ensureAuthenticated();

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const startTime = new Date(appointment.datetime);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const event = {
        summary: `Appointment: ${appointment.serviceName || 'Service'}`,
        description: this.formatEventDescription(appointment),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: this.getAttendees(appointment.userEmail, staffEmail),
      };

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
        sendUpdates: 'all',
      });

      return {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        meetLink: response.data.hangoutLink || null,
        synced: true,
      };
    } catch (error) {
      this.logger.error('Failed to update calendar event:', error.message);
      return { eventId, synced: false };
    }
  }

  async deleteCalendarEvent(eventId: string) {
    try {
      if (!this.isInitialized) {
        return;
      }

      await this.ensureAuthenticated();

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });
      
      this.logger.log(`Calendar event deleted: ${eventId}`);
    } catch (error) {
      this.logger.error('Failed to delete calendar event:', error.message);
      throw error;
    }
  }

  private getUnavailableEventData(): CalendarEventResult {
    return {
      eventId: null,
      eventLink: null,
      meetLink: null,
      synced: false,
    };
  }

  private formatEventDescription(appointment: any): string {
    const lines = [
      `Service: ${appointment.serviceName || 'N/A'}`,
      `Provider: ${appointment.providerName || 'N/A'}`,
      `Priority: ${appointment.priority || 'Normal'}`,
    ];

    if (appointment.notes) {
      lines.push(`Notes: ${appointment.notes}`);
    }

    if (!appointment.forSelf && appointment.patientName) {
      lines.push(`Patient: ${appointment.patientName}`);
    }

    return lines.join('\n');
  }

  private getAttendees(userEmail: string, staffEmail?: string): Array<{ email: string }> {
    const attendees = [];
    if (userEmail) attendees.push({ email: userEmail });
    if (staffEmail) attendees.push({ email: staffEmail });
    return attendees;
  }

  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar client not initialized');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      prompt: 'consent',
    });
  }

  async handleCallback(code: string): Promise<Credentials> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      if (tokens.refresh_token) {
        this.logger.log('Received new refresh token');
      }
      
      this.isInitialized = true;
      return tokens;
    } catch (error) {
      this.logger.error('Failed to get tokens from code:', error.message);
      throw error;
    }
  }
}