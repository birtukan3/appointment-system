// No changes needed - this file is correct
import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();

  set(key: string, value: any, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < Date.now()) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }
}