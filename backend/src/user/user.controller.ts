import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUserDto, FindOneDto, LoginDto, ResetPasswordDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
import { AuthGuard, type ExpressRequest } from 'src/lib/auth.guard';
import { CreateShortlistDto, PaginationDto } from './dto/create-shortlist.dto';
import { RolesGuard } from 'src/lib/roles.guard';
import { Roles } from 'src/lib/roles.decorator';
import { UserType } from './entities/user.entity';

@Controller('user')
export class UserController {
  private logger = new Logger(UserController.name)
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  @Post('login-user')
  logInUser(@Body() createUserDto: LoginDto) {
    return this.userService.loginUser(createUserDto);
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
