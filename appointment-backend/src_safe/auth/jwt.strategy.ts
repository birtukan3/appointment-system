import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'smartoffice-secret-key-change-in-production'),
    });
  }

  async validate(payload: any) {
    // Support multiple payload formats for flexibility
    const userId = payload.sub || payload.userId || payload.id;
    const email = payload.email;
    const role = payload.role || 'user';
    
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    return {
      userId: userId,
      email: email,
      role: role,
    };
  }
}