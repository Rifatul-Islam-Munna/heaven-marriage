import {DashboardPermission} from '../staff-access/permissions';
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, Logger, Res, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminSetPasswordDto, AdminUserDto, FindOneDto, FindOneTokenDto, LoginDto, NewPasswordResetWithOtp, OtpstringDto, ReqForDto, ResetPasswordDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
import { OptionalAuthGuard, AuthGuard, type ExpressRequest } from 'src/lib/auth.guard';
import { CreateShortlistDto, PaginationDto } from './dto/create-shortlist.dto';
import { RolesGuard } from 'src/lib/roles.guard';
import { Roles } from 'src/lib/roles.decorator';
import { UserType } from './entities/user.entity';
import { type Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RequestNumberDto } from './dto/request-number.dto';
@Controller('user')
@UseGuards(ThrottlerGuard)
export class UserController {
  private logger = new Logger(UserController.name)
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



  @Throttle({default:{limit:30,ttl:60000}})
  @Get('premium-payment-callback')
  async premiumPaymentCallback(
    @Query('paymentID') paymentID: string,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const base = process.env.FRONTEND_URL;
    if (!base) throw new BadRequestException('Frontend URL is not configured');
    const redirectBase = base.replace(/\/$/, '');
    if (status !== 'success' || !paymentID)
      return res.redirect(redirectBase + '/payment/failed?purpose=premium');
    try {
      const result = await this.userService.executePremiumPayment(paymentID);
      return res.redirect(redirectBase + (result.success
        ? '/payment/successfull?purpose=premium'
        : '/payment/failed?purpose=premium'));
    } catch {
      return res.redirect(redirectBase + '/payment/failed?purpose=premium');
    }
  }

  @Throttle({default:{limit:60,ttl:60}})
  @Get("execute-payment-callback")
 async executePayment( @Query('paymentID') paymentID: string,
    @Query('status') status: string,
    @Res() res: Response,) {
       if (!paymentID || !status) {
        this.logger.error('Missing paymentID or status');
        throw new BadRequestException('Missing paymentID or status');
      }
      const frontendBaseUrl = process.env.FRONTEND_URL as string;
      if (status === 'success') {
        const result = await this.userService.executePayment(paymentID);
        if(result.success){
         return res.redirect(`${frontendBaseUrl}/payment/successfull`);
        }
           return res.redirect(`${frontendBaseUrl}/payment/failed`);
      }
   return   res.redirect(`${frontendBaseUrl}/payment/failed`);


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
