import {DashboardPermission} from '../staff-access/permissions';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, BadRequestException, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminSetPasswordDto, AdminUserDto, FindOneDto, FindOneTokenDto, LoginDto, NewPasswordResetWithOtp, OtpstringDto, ReqForDto, ResetPasswordDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
import { OptionalAuthGuard, AuthGuard, type ExpressRequest } from 'src/lib/auth.guard';
import { CreateShortlistDto, PaginationDto } from './dto/create-shortlist.dto';
import { RolesGuard } from 'src/lib/roles.guard';
import { Roles } from 'src/lib/roles.decorator';
import { UserType } from './entities/user.entity';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RequestNumberDto } from './dto/request-number.dto';
@Controller('user')
@UseGuards(ThrottlerGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

    @Post()
    @UseGuards(ThrottlerGuard)
    @Throttle({default:{limit:20, ttl:3600000}})
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  @Post('resend-otp')
  @Throttle({default:{limit:5,ttl:600000}})
  resendOtp(@Body() p:{challengeId:string}) {return this.userService.resendOtp(p.challengeId);}
  @Post('verify-otp')
      @UseGuards(ThrottlerGuard)
  @Throttle({default:{limit:30,ttl:1800000}})
  verifyOtp(@Body() createUserDto: OtpstringDto) {
    return this.userService.verifyOtp(createUserDto);
  }
  @UseGuards(ThrottlerGuard)
  @Throttle({default:{limit:30,ttl:1800000}})
  @Post('login-user')
  logInUser(@Body() createUserDto: LoginDto) {
    return this.userService.loginUser(createUserDto);
  }
  @UseGuards(ThrottlerGuard)
  @Throttle({default:{limit:100,ttl:1800000}})
  @Post('login-user-with-google')
  LoginWithGoogle(@Body() createUserDto: FindOneTokenDto) {
    return this.userService.loginWithGoogle(createUserDto.id);
  }
  @Post('add-to-shortlist')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserType.USER)
  AddToShortList(@Body() createUserDto: CreateShortlistDto,@Req() req:ExpressRequest) {
    return this.userService.addToShortList(createUserDto,req?.user?.id);
  }
  @Post('remove-from-shortlist')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserType.USER)
  RemoveFromShortList(@Body() createUserDto: CreateShortlistDto,@Req() req:ExpressRequest) {
    return this.userService.removeFromShortList(createUserDto,req?.user?.id);
  }

  @Throttle({default:{limit:20,ttl:60}})
  @Post('request-for-number')
  @UseGuards(AuthGuard)
  RequestForNumber(@Body() createUserDto: RequestNumberDto,@Req() req:ExpressRequest) {
    return this.userService.createRequestNumber(createUserDto,req.user.id);
  }


  @Throttle({default:{limit:2,ttl:60}})
  @UseGuards(AuthGuard)
  @Post("Buy-packages")
  BuyPackages(@Body() id: FindOneDto,@Req() req:ExpressRequest) {
    return this.userService.createPayment(id?.id,req.user?.id);
  }
  @Throttle({default:{limit:10,ttl:3600000}})
  @Post("forgot-password-send-otp")
  RequestForOtpReqPassword(@Body() id: ReqForDto) {
    return this.userService.RequestForOtpRestPassword(id);
  }
  @Throttle({default:{limit:30,ttl:3600000}})
  @Post("verify-and-reset-password")
  RestPasswordWithOtp(@Body() id: NewPasswordResetWithOtp) {
    return this.userService.ResetPasswordWithOtp(id);
  }

  @Get("get-all-user")
  async findAll(@Query() query: UserFilterDto) {
    return this.userService.findAll(query);
  }
  @Get("get-shortlist-user")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserType.USER)
  async getMyShortList(@Req() req:ExpressRequest,@Query() query: PaginationDto) {
    return this.userService.getShortlist(req.user.id,query);
  }

  // The reverse of My Favourites: only users who saved the caller's biodata.
  @Get("get-who-favourited-me")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserType.USER)
  async getWhoFavouritedMe(@Req() req:ExpressRequest,@Query() query: PaginationDto) {
    return this.userService.getWhoFavouritedMe(req.user.id, query);
  }

  @Get('get-one-user')
  @UseGuards(OptionalAuthGuard)
  findOne(@Query() id: FindOneDto,@Req() req:ExpressRequest) {
    return this.userService.findOne(id,req.user?.id,req.user?.role);
  }
  @Get('get-all-user-for-admin')
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('users')

  getAllUserForAdmin(@Query() query: AdminUserDto,@Req() req:ExpressRequest) {
    return this.userService.getUserForAdmin(query,req.user.role);
  }

  @UseGuards(AuthGuard)
  @Get("get-my-profile")
  getMyProfile(@Req() req:ExpressRequest) {
    return this.userService.finMyProfile(req.user?.id);
  }
  @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('users')
  @Get("get-user-profile-admin")
  getUserProfile(@Query() id: FindOneDto,@Req() req:ExpressRequest) {
    return this.userService.adminProfile(id?.id,req.user.role);
  }

  @UseGuards(AuthGuard)
  @Get("get-my-request-number")
  getMyRequestNumber(@Req() req:ExpressRequest,@Query() query:PaginationDto) {
    return this.userService.getMyRequests(req.user?.id,query);
  }



  private async processZiniPayWebhook(payload: Record<string, unknown>) {
    const invoiceId = typeof payload.invoice_id === 'string' ? payload.invoice_id.trim() : '';
    if (!invoiceId || invoiceId.length > 150)
      throw new BadRequestException('Invalid ZiniPay invoice reference');

    // The webhook's status is only a notification. The backend still verifies
    // the invoice directly with ZiniPay before granting anything.
    if (!['true', '1'].includes(String(payload.status ?? '').toLowerCase()))
      return { received: true, verified: false };

    const premium = await this.userService.executePremiumPayment(invoiceId);
    if (premium.success)
      return { received: true, verified: true, purpose: 'premium' };
    if (premium.retryable)
      throw new ServiceUnavailableException('ZiniPay verification is still pending; retry this webhook');

    const connections = await this.userService.executePayment(invoiceId);
    if (connections.retryable)
      throw new ServiceUnavailableException('ZiniPay verification is still pending; retry this webhook');
    return {
      received: true,
      verified: connections.success,
      ...(connections.success ? { purpose: 'connections' } : {}),
    };
  }

  @Post('zinipay-payment-webhook')
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async zinipayPaymentWebhook(@Body() body: unknown, @Query() query: Record<string, unknown>) {
    const queryPayload = query && typeof query === 'object' ? query : {};
    const bodyPayload = body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
    return this.processZiniPayWebhook({ ...queryPayload, ...bodyPayload });
  }

  // The documentation also supports query-parameter webhook callbacks.
  @Get('zinipay-payment-webhook')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async zinipayPaymentWebhookQuery(@Query() query: Record<string, unknown>) {
    return this.processZiniPayWebhook(query || {});
  }
  @UseGuards(AuthGuard,ThrottlerGuard )
  @Throttle({default:{limit:500, ttl:1800000}})
  @Patch('update-user')
  update( @Body() updateUserDto: UpdateUserDto,@Req() req:ExpressRequest) {
    return this.userService.updatedFullUserInformation( updateUserDto,req.user?.id);
  }
  @Throttle({default:{limit:60,ttl:60}})
  @Patch('update-user-password')
  @UseGuards(AuthGuard)
  updatePassword( @Body() updateUserDto: ResetPasswordDto,@Req() req:ExpressRequest) {
    return this.userService.updatePassword( req.user?.id,updateUserDto);
  }
  @Patch('update-user-admin')
  @UseGuards(AuthGuard,RolesGuard,ThrottlerGuard)
  @Throttle({default:{limit:200, ttl:3600000}})
  @DashboardPermission('users')
  UpdateUserAdmin( @Body() updateUserDto: UpdateUserDto,@Req() req:ExpressRequest) {
    return this.userService.update( updateUserDto,req.user.id,req.user.role);
  }
  @Patch('admin-set-password')
  @UseGuards(AuthGuard,RolesGuard,ThrottlerGuard)
  @Throttle({default:{limit:30, ttl:3600000}})
  @DashboardPermission('users')
  AdminSetPassword( @Body() dto: AdminSetPasswordDto,@Req() req:ExpressRequest) {
    return this.userService.adminSetPassword( dto,req.user.id,req.user.role);
  }
  @Patch('publish-user-admin')
  @UseGuards(AuthGuard,RolesGuard,ThrottlerGuard)
  @Throttle({default:{limit:100,ttl:3600000}})
  @DashboardPermission('users')
  publishUserAdmin(@Body() body:FindOneDto,@Req() req:ExpressRequest) {
    return this.userService.publishUserAdmin(body.id,req.user.id,req.user.role);
  }

  @Patch('update-user-subscriber')
    @UseGuards(AuthGuard,RolesGuard)
  @DashboardPermission('users')
  UpdateUserSubscriber( @Body() updateUserDto: FindOneDto,@Req() req:ExpressRequest) {
    return this.userService.toggleSubscription( updateUserDto.id,req.user.id,req.user.role);
  }

  // Backward-compatible endpoint: it only creates an admin-reviewed request.
  @Delete('delete-my-account')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserType.USER)
  remove(@Req() req:ExpressRequest) {
    return this.userService.removeUser(req?.user?.id);
  }
  @Delete('delete-user-admin')
  @UseGuards(AuthGuard,RolesGuard,ThrottlerGuard)
  @Throttle({default:{limit:200, ttl:3600000}})
  @DashboardPermission('users')

  deleteUser(@Query() id: FindOneDto,@Req() req:ExpressRequest) {
    return this.userService.remove(id,req.user.id,req.user.role);
  }


}
