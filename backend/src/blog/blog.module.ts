import {Module} from '@nestjs/common';
import {BlogService} from './blog.service';
import {ImageModule} from '../image/image.module';
import {BlogMediaController} from './blog-media.controller';
import {BlogMediaService} from './blog-media.service';
import {PublicBlogController,AdminBlogController} from './blog.controller';

@Module({
  imports:[ImageModule],
  controllers:[PublicBlogController,AdminBlogController,BlogMediaController],
  providers:[BlogService,BlogMediaService],
  exports:[BlogService],
})
export class BlogModule {}
