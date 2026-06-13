"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

export function useWebSocket(eventHandlers = {}, options = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const eventHandlersRef = useRef(eventHandlers);

  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  const connect = useCallback((query = {}) => {
    if (socket) return;

    const newSocket = io(url, {
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      query,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempt(0);
      
      if (eventHandlersRef.current.onConnect) {
        eventHandlersRef.current.onConnect();
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (eventHandlersRef.current.onDisconnect) {
        eventHandlersRef.current.onDisconnect(reason);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionError(error);
      setReconnectAttempt(prev => prev + 1);
      
      if (eventHandlersRef.current.onError) {
        eventHandlersRef.current.onError(error);
      }
    });

    // Register dynamic event handlers
    Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
      if (typeof handler === 'function' && !['onConnect', 'onDisconnect', 'onError'].includes(event)) {
        newSocket.on(event, handler);
      }
    });

    setSocket(newSocket);
  }, [socket, url, reconnection, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const emit = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
      return true;
    }
    console.warn(`Cannot emit ${event}: socket not connected`);
    return false;
  }, [socket, isConnected]);

  const on = useCallback((event, handler) => {
    if (socket) {
      socket.on(event, handler);
      return () => socket.off(event, handler);
    }
    return () => {};
  }, [socket]);

  const off = useCallback((event, handler) => {
    if (socket && event) {
      socket.off(event, handler);
    }
  }, [socket]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [autoConnect, connect]);

  return {
    socket,
    isConnected,
    connectionError,
    reconnectAttempt,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}