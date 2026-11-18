import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../modules/users/users.service';
import { getJwtSecret } from './jwt-secret';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: { sub?: string }): Promise<AuthenticatedUser> {
    // A deleted or deactivated account must lose access immediately, even
    // with a token that has not expired yet (previously: 404 / still valid).
    const user = payload?.sub ? await this.usersService.findActiveById(payload.sub) : null;
    if (!user) throw new UnauthorizedException();
    return { id: user._id.toString(), email: user.email, name: user.name, role: user.role as any };
  }
}
