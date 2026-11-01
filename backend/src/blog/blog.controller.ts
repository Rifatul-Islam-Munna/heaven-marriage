import {DashboardPermission} from '../staff-access/permissions';
import {Body,Controller,Delete,Get,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {AuthGuard,type ExpressRequest} from '../lib/auth.guard';
import {RolesGuard} from '../lib/roles.guard';
import {Roles} from '../lib/roles.decorator';
import {UserType} from '../user/entities/user.entity';
import {BlogService} from './blog.service';

@Controller('blog')
export class PublicBlogController{
  constructor(private readonly blog:BlogService){}
  @Get()
  list(@Query()query:{page?:string;limit?:string;category?:string;q?:string}){
    return this.blog.listPublic(query);
  }
  @Get('categories')
  categories(){return this.blog.categories();}
  @Get('sitemap')
  sitemap(){return this.blog.sitemap();}
  @Get('article/:slug')
  article(@Param('slug')slug:string){return this.blog.onePublished(slug);}
}

@Controller('blog/admin')
@UseGuards(AuthGuard,RolesGuard)
@DashboardPermission('blog')
export class AdminBlogController{
  constructor(private readonly blog:BlogService){}
  @Get()
  list(@Query()query:{page?:string;q?:string}){return this.blog.listAdmin(query);}
  @Get('categories')
  categories(){return this.blog.adminCategories();}
  @Post('categories')
  addCategory(@Req()req:ExpressRequest,@Body()input:unknown){return this.blog.addCategory(req.user.id,input);}
  @Patch('categories/:id')
  renameCategory(@Req()req:ExpressRequest,@Param('id')id:string,@Body()input:unknown){
    return this.blog.renameCategory(req.user.id,id,input);
  }
  @Delete('categories/:id')
  removeCategory(@Req()req:ExpressRequest,@Param('id')id:string){
    return this.blog.removeCategory(req.user.id,id);
  }
  @Get(':id')
  one(@Param('id')id:string){return this.blog.adminOne(id);}
  @Post()
  create(@Req()req:ExpressRequest){return this.blog.create(req.user.id);}
  @Patch(':id')
  save(@Req()req:ExpressRequest,@Param('id')id:string,@Body()input:unknown){
    return this.blog.save(req.user.id,id,input);
  }
  @Post(':id/publish')
  publish(@Req()req:ExpressRequest,@Param('id')id:string,@Body()input:unknown){
    return this.blog.publish(req.user.id,id,input);
  }
  @Post(':id/unpublish')
  unpublish(@Req()req:ExpressRequest,@Param('id')id:string,@Body()input:unknown){
    return this.blog.unpublish(req.user.id,id,input);
  }
  @Post(':id/restore')
  restore(@Req()req:ExpressRequest,@Param('id')id:string,@Body()input:unknown){
    return this.blog.restore(req.user.id,id,input);
  }
  @Delete(':id')
  archive(@Req()req:ExpressRequest,@Param('id')id:string,@Body()input:unknown){
    return this.blog.archive(req.user.id,id,input);
  }
}
