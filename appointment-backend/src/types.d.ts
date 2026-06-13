// src/types.d.ts - Fix all missing type definitions
declare module 'd3-array';
declare module 'd3-color';
declare module 'd3-ease';
declare module 'd3-interpolate';
declare module 'd3-path';
declare module 'd3-scale';
declare module 'd3-shape';
declare module 'd3-time';
declare module 'd3-timer';
declare module 'prop-types';
declare module 'react';
declare module 'react-dom';

// Fix for ConfigService type
declare namespace ConfigService {
  export interface ConfigService {
    get(key: string): string;
    get(key: string, defaultValue: string): string;
  }
}

// Fix for EventEmitter2
declare namespace EventEmitter2 {
  export interface EventEmitter2 {
    emit(event: string | string[], ...values: any[]): boolean;
  }
}