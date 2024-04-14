import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { RateLimiterInterceptor } from 'src/interceptors/rate-limiter.interceptor';

@Controller('token')
export class TokensController {
  @Get()
  @UseInterceptors(RateLimiterInterceptor)
  getUserSettings(@Req() request: Request) {
    if (request['user']) {
      delete request['user']['id'];
      delete request['user']['accessKey'];
      return {
        static_data: `The response should be a mock or static data, as the focus is on access control rather than the data itself`,
      };
    }
    throw new UnauthorizedException({ message: 'not allowed' });
  }
}
