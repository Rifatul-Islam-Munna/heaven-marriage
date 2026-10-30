import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard, type ExpressRequest } from '../lib/auth.guard';
import { ProfileAiService } from './profile-ai.service';
import { ProfileAiTurnDto } from './profile-ai.dto';
@Controller('platform/ai/profile')
@UseGuards(AuthGuard, ThrottlerGuard)
export class ProfileAiController {
  constructor(private readonly service: ProfileAiService) {}
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  session(@Req() req: ExpressRequest) {
    return this.service.session(req.user.id);
  }
  @Post()
  @Throttle({ default: { limit: 60, ttl: 3600000 } })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  turn(@Req() req: ExpressRequest, @Body() dto: ProfileAiTurnDto) {
    return this.service.turn(req.user.id, dto);
  }
}
