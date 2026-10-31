import {DashboardPermission} from '../staff-access/permissions';
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
  @DashboardPermission('visual-editor')
  page(@Query('path') path: string) {
    return this.content.adminPage(path);
  }

  @Get('list')
  @DashboardPermission('visual-editor')
  list() {
    return this.content.list();
  }

  @Patch()
  @DashboardPermission('visual-editor')
  update(@Req() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    return this.content.update(req.user.id, body);
  }

  @Delete()
  @DashboardPermission('visual-editor')
  reset(@Req() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    return this.content.reset(req.user.id, body);
  }

  @Post('publish')
  @DashboardPermission('visual-editor')
  publish(@Req() req: ExpressRequest, @Body() body: Record<string, unknown>) {
    return this.content.publish(req.user.id, body);
  }
}
