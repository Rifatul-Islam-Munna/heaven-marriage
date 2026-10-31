import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard, type ExpressRequest } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
import { Roles } from '../lib/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { AdminDeliveryTestService } from './admin-delivery-test.service';

/** Only real, currently authorized administrators can trigger delivery tests. */
@Controller('staff-access/admin/delivery')
@UseGuards(AuthGuard, RolesGuard, ThrottlerGuard)
@Roles(UserType.ADMIN)
export class AdminDeliveryTestController {
  constructor(private readonly delivery: AdminDeliveryTestService) {}

  @Get('status')
  status() {
    return this.delivery.status();
  }

  @Post('email')
  @Throttle({ default: { limit: 6, ttl: 3600000 } })
  email(@Req() req: ExpressRequest, @Body() payload: unknown) {
    return this.delivery.sendEmail(req.user.id, payload);
  }

  @Post('otp')
  @Throttle({ default: { limit: 6, ttl: 3600000 } })
  otp(@Req() req: ExpressRequest, @Body() payload: unknown) {
    return this.delivery.sendOtp(req.user.id, payload);
  }

  @Post('verify')
  @Throttle({ default: { limit: 25, ttl: 3600000 } })
  verify(@Req() req: ExpressRequest, @Body() payload: unknown) {
    return this.delivery.verifyOtp(req.user.id, payload);
  }
}
