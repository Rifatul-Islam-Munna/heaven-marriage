import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, Logger, Res, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUserDto, FindOneDto, FindOneTokenDto, LoginDto, OtpstringDto, ResetPasswordDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
import { AuthGuard, type ExpressRequest } from 'src/lib/auth.guard';
import { CreateShortlistDto, PaginationDto } from './dto/create-shortlist.dto';
import { RolesGuard } from 'src/lib/roles.guard';
import { Roles } from 'src/lib/roles.decorator';
import { UserType } from './entities/user.entity';
import { type Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { RequestNumberDto } from './dto/request-number.dto';
@Controller('user')
export class UserController {
  private logger = new Logger(UserController.name)
  constructor(private readonly userService: UserService) {}

    @Post()
    @Throttle({default:{limit:3,ttl:1800}}) 
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  @Post('verify-otp')
  @Throttle({default:{limit:30,ttl:1800}}) 
  verifyOtp(@Body() createUserDto: OtpstringDto) {
    return this.userService.verifyOtp(createUserDto.otp);
  }
  @Throttle({default:{limit:3,ttl:60}}) 
  @Post('login-user')
  logInUser(@Body() createUserDto: LoginDto) {
    return this.userService.loginUser(createUserDto);
  }
  @Throttle({default:{limit:2,ttl:60}}) 
  @Post('login-user-with-google')
  LoginWithGoogle(@Body() createUserDto: FindOneTokenDto) {
    return this.userService.loginWithGoogle(createUserDto.id);
  }
  @Post('add-to-shortlist')
  @UseGuards(AuthGuard)
  AddToShortList(@Body() createUserDto: CreateShortlistDto,@Req() req:ExpressRequest) {
    return this.userService.addToShortList(createUserDto,req?.user?.id);
  }
  @Post('remove-from-shortlist')
  @UseGuards(AuthGuard)
  RemoveFromShortList(@Body() createUserDto: CreateShortlistDto,@Req() req:ExpressRequest) {
    return this.userService.removeFromShortList(createUserDto,req?.user?.id);
  }

  @Throttle({default:{limit:20,ttl:60}}) 
  @Post('request-for-number')
  @UseGuards(AuthGuard)
  RequestForNumber(@Body() createUserDto: RequestNumberDto) {
    return this.userService.createRequestNumber(createUserDto);
  }


  @Throttle({default:{limit:2,ttl:60}}) 
  @UseGuards(AuthGuard)
  @Post("Buy-packages")
  BuyPackages(@Body() id: FindOneDto,@Req() req:ExpressRequest) {
    return this.userService.createPayment(id?.id,req.user?.id);
  }

  @Get("get-all-user")
  async findAll(@Query() query: UserFilterDto) {
    return this.userService.findAll(query);
  }
  @Get("get-shortlist-user")
  @UseGuards(AuthGuard)
  async getMyShortList(@Req() req:ExpressRequest,@Query() query: PaginationDto) {
    return this.userService.getShortlist(req?.user?.id,query);
  }
 

  @Get('get-one-user')
  findOne(@Query() id: FindOneDto) {
    return this.userService.findOne(id);
  }
  @Get('get-all-user-for-admin')
  @UseGuards(AuthGuard,RolesGuard)
 /*  @Roles(UserType.ADMIN) */

  getAllUserForAdmin(@Query() query: AdminUserDto) {
    return this.userService.getUserForAdmin(query);
  }

  @UseGuards(AuthGuard)
  @Get("get-my-profile")
  getMyProfile(@Req() req:ExpressRequest) {
    return this.userService.finMyProfile(req.user?.id);
  }
  @UseGuards(AuthGuard)
  @Get("get-my-request-number")
  getMyRequestNumber(@Req() req:ExpressRequest,@Query() query:PaginationDto) {
    return this.userService.getMyRequests(req.user?.id,query);
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

  @UseGuards(AuthGuard)

  @Patch('update-user')
  update( @Body() updateUserDto: UpdateUserDto,@Req() req:ExpressRequest) {
    return this.userService.updatedFullUserInformation( updateUserDto,req.user?.id);
  }
  @Patch('update-user-password')
  @UseGuards(AuthGuard)
  updatePassword( @Body() updateUserDto: ResetPasswordDto,@Req() req:ExpressRequest) {
    return this.userService.updatePassword( req.user?.id,updateUserDto);
  }
  @Patch('update-user-admin')
  UpdateUserAdmin( @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update( updateUserDto);
  }
  @Patch('update-user-subscriber')
    @UseGuards(AuthGuard,RolesGuard)
 /*  @Roles(UserType.ADMIN) */
  UpdateUserSubscriber( @Body() updateUserDto: FindOneDto) {
    return this.userService.toggleSubscription( updateUserDto.id);
  }

  @Delete('delete-one-user')
  remove(@Query('id') id: FindOneDto) {
    return this.userService.remove(id);
  }
  @Delete('delete-user-admin')
  @UseGuards(AuthGuard,RolesGuard)
 /*  @Roles(UserType.ADMIN) */
  deleteUser(@Query() id: FindOneDto) {
    return this.userService.remove(id);
  }

 
}
