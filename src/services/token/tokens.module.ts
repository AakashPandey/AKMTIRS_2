import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/core/entities/user.entity';
import { RateLimiterInterceptor } from 'src/interceptors/rate-limiter.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [RateLimiterInterceptor],
  exports: [RateLimiterInterceptor, TypeOrmModule.forFeature([User])],
})
export class TokensModule {}
