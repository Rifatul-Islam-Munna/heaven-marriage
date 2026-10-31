import {Module} from '@nestjs/common';
import {BlogService} from './blog.service';
import {PublicBlogController,AdminBlogController} from './blog.controller';

@Module({
  controllers:[PublicBlogController,AdminBlogController],
  providers:[BlogService],
  exports:[BlogService],
})
export class BlogModule {}
