// src/gateway_backup/app.gateway.ts - COMPLETE FIXED VERSION
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// WsResponse type definition
interface WsResponse<T = any> {
  event: string;
  data: T;
}

interface ConnectedClient {
  clientId: string;
  userId?: string;
  userEmail?: string;
  role?: string;
  joinedAt: Date;
  rooms: string[];
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  },
  namespace: '/',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);
  private clients: Map<string, ConnectedClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const clientData: ConnectedClient = {
      clientId: client.id,
      joinedAt: new Date(),
      rooms: [],
    };
    
    const userId = client.handshake.query.userId as string;
    const userEmail = client.handshake.query.userEmail as string;
    const role = client.handshake.query.role as string;
    
    if (userId) {
      clientData.userId = userId;
      clientData.userEmail = userEmail;
      clientData.role = role;
    }
    
    this.clients.set(client.id, clientData);
    this.logger.log(`Client connected: ${client.id}, Total clients: ${this.clients.size}`);
    this.emitToAll('clientsCount', { count: this.clients.size });
  }

  handleDisconnect(client: Socket) {
    const clientData = this.clients.get(client.id);
    
    if (clientData && clientData.rooms) {
      for (const room of clientData.rooms) {
        if (this.rooms.has(room)) {
          this.rooms.get(room).delete(client.id);
          if (this.rooms.get(room).size === 0) {
            this.rooms.delete(room);
          }
        }
      }
    }
    
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}, Total clients: ${this.clients.size}`);
    this.emitToAll('clientsCount', { count: this.clients.size });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; userId?: string; userEmail?: string },
  ): WsResponse<any> {
    if (!data.room) {
      return { event: 'error', data: { message: 'Room name is required' } };
    }
    
    client.join(data.room);
    
    if (!this.rooms.has(data.room)) {
      this.rooms.set(data.room, new Set());
    }
    this.rooms.get(data.room).add(client.id);
    
    const clientData = this.clients.get(client.id);
    if (clientData) {
      if (!clientData.rooms.includes(data.room)) {
        clientData.rooms.push(data.room);
      }
      if (data.userId) {
        clientData.userId = data.userId;
        clientData.userEmail = data.userEmail;
      }
      this.clients.set(client.id, clientData);
    }
    
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);
    client.to(data.room).emit('userJoined', { 
      userId: data.userId || client.id, 
      room: data.room,
      timestamp: new Date().toISOString(),
    });
    
    return {
      event: 'joinedRoom',
      data: { room: data.room, message: `Joined room ${data.room}` },
    };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ): WsResponse<any> {
    if (!data.room) {
      return { event: 'error', data: { message: 'Room name is required' } };
    }
    
    client.leave(data.room);
    
    if (this.rooms.has(data.room)) {
      this.rooms.get(data.room).delete(client.id);
      if (this.rooms.get(data.room).size === 0) {
        this.rooms.delete(data.room);
      }
    }
    
    const clientData = this.clients.get(client.id);
    if (clientData) {
      clientData.rooms = clientData.rooms.filter(r => r !== data.room);
      this.clients.set(client.id, clientData);
    }
    
    this.logger.log(`Client ${client.id} left room: ${data.room}`);
    
    return {
      event: 'leftRoom',
      data: { room: data.room, message: `Left room ${data.room}` },
    };
  }

  @SubscribeMessage('newNotification')
  handleNewNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; notification: any; userId?: string },
  ): WsResponse<any> {
    if (!data.room || !data.notification) {
      return { event: 'error', data: { message: 'Room and notification are required' } };
    }
    
    const notificationWithTimestamp = {
      ...data.notification,
      socketTimestamp: new Date().toISOString(),
    };
    
    if (data.room === 'user' && data.userId) {
      this.server.to(`user_${data.userId}`).emit('newNotification', notificationWithTimestamp);
    } else {
      this.server.to(data.room).emit('newNotification', notificationWithTimestamp);
    }
    
    this.logger.log(`Notification sent to room: ${data.room}`);
    
    return { event: 'notificationSent', data: { success: true } };
  }

  @SubscribeMessage('appointmentUpdate')
  handleAppointmentUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: number; status: string; room?: string; userId?: number },
  ): WsResponse<any> {
    const targetRooms = [];
    
    if (data.room) {
      targetRooms.push(data.room);
    }
    
    if (data.userId) {
      targetRooms.push(`user_${data.userId}`);
    }
    
    targetRooms.push('admin');
    
    const updateData = {
      appointmentId: data.appointmentId,
      status: data.status,
      timestamp: new Date().toISOString(),
    };
    
    for (const room of targetRooms) {
      this.server.to(room).emit('appointmentUpdate', updateData);
    }
    
    this.logger.log(`Appointment update sent to rooms: ${targetRooms.join(', ')}`);
    
    return { event: 'updateSent', data: { success: true } };
  }

  @SubscribeMessage('statsUpdate')
  handleStatsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { stats: any; room?: string },
  ): WsResponse<any> {
    const targetRoom = data.room || 'admin';
    this.server.to(targetRoom).emit('statsUpdate', {
      ...data.stats,
      timestamp: new Date().toISOString(),
    });
    
    return { event: 'statsSent', data: { success: true } };
  }

  @SubscribeMessage('ping')
  handlePing(): WsResponse<any> {
    return {
      event: 'pong',
      data: { pong: 'pong', timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('getClients')
  handleGetClients(): WsResponse<any> {
    const clientsList = Array.from(this.clients.entries()).map(([id, data]) => ({
      clientId: id,
      userId: data.userId,
      userEmail: data.userEmail,
      role: data.role,
      joinedAt: data.joinedAt,
      rooms: data.rooms,
    }));
    
    return {
      event: 'clientsList',
      data: {
        connectedClients: this.clients.size,
        activeRooms: this.rooms.size,
        timestamp: new Date().toISOString(),
        clients: clientsList,
      },
    };
  }

  // Public methods for external use
  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  sendToClient(clientId: string, event: string, data: any) {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      client.emit(event, data);
    }
  }

  sendToUser(userId: string | number, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  sendToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  private emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}

