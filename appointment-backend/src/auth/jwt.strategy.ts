import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
    });
  }

  async validate(payload: any) {
    const userId = payload.sub || payload.userId || payload.id;
    const email = payload.email;
    const role = payload.role || 'user';
    const name = payload.name;

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: userId,
      userId: userId,
      email: email,
      role: role,
      name: name,
    };
  }
}