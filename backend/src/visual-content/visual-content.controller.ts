import {
  Body, Controller, Delete, Get, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { AuthGuard, type ExpressRequest } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
import { Roles } from '../lib/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { VisualContentService } from './visual-content.service';

@Controller('visual-content')
export class PublicVisualContentController {
  constructor(private readonly content: VisualContentService) {}

  @Get()
  page(@Query('path') path: string) {
    return this.content.publicPage(path);
  }
}

@Controller('visual-content/admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminVisualContentController {
  constructor(private readonly content: VisualContentService) {}

  @Get()
  @Roles(UserType.ADMIN)
  page(@Query('path') path: string) {
    return this.content.adminPage(path);
  }

  @Get('list')
  @Roles(UserType.ADMIN)
  list() {
    return this.content.list();
  }

  @Patch()
  @Roles(UserType.ADMIN)
  update(@Req() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    return this.content.update(req.user.id, body);
  }

  @Delete()
  @Roles(UserType.ADMIN)
  reset(@Req() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    return this.content.reset(req.user.id, body);
  }

  @Post('publish')
  @Roles(UserType.ADMIN)
  publish(@Req() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    return this.content.publish(req.user.id, body);
  }
}
