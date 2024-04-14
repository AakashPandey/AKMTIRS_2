import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/core/entities/user.entity';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class RateLimiterInterceptor implements NestInterceptor {
  constructor(
    @InjectRedis() private readonly redisService: Redis,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const accessKey = request.headers['x-access-key'];
    if (accessKey == undefined) {
      throw new UnauthorizedException({
        message: 'access-key missing, not allowed',
      });
    }

    const user = await this.userRepository.findOneBy({ accessKey: accessKey });
    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid Access-key',
      });
    }

    if (!user.isKeyActive) {
      this.logger.info(`ACCESS_KEY [INACTIVE]: ${accessKey}`, '/token');
      throw new HttpException('Access-key inactive', HttpStatus.FORBIDDEN);
    }

    if (user.keyExpiration && new Date() > user.keyExpiration) {
      this.logger.info(`ACCESS_KEY [EXPIRED]: ${accessKey}`, '/token');
      throw new HttpException('Access key expired', HttpStatus.FORBIDDEN);
    }
    const currentCountStr = await this.redisService.get(accessKey);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
    // console.log('Allowed', user.rateLimit);
    // console.log('Logged ', currentCount);
    if (currentCount >= user.rateLimit) {
      this.logger.info(`ACCESS_KEY [RATE_LIMITED]: ${accessKey}`, '/token');
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.redisService.incr(accessKey);
    if (currentCount === 0) {
      await this.redisService.expire(accessKey, 60);
    }
    request.user = user;
    request.user.rateCount = currentCount + 1;
    this.logger.info(`ACCESS_KEY [VALID]: ${accessKey}`, '/token');
    return next.handle();
  }
}
