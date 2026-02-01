import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FindOneDto, LoginDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  @Post('login-user')
  logInUser(@Body() createUserDto: LoginDto) {
    return this.userService.loginUser(createUserDto);
  }

  @Get("get-all-user")
  async findAll(@Query() query: UserFilterDto) {
    return this.userService.findAll(query);
  }
 

  @Get('get-one-user')
  findOne(@Query() id: FindOneDto) {
    return this.userService.findOne(id);
  }

  @Patch('update-user')
  update( @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updatedFullUserInformation( updateUserDto);
  }
  @Patch('update-user-admin')
  UpdateUserAdmin( @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update( updateUserDto);
  }

  @Delete('delete-one-user')
  remove(@Query('id') id: FindOneDto) {
    return this.userService.remove(id);
  }
}
