import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsRepository } from './posts.repository';
import { Post, PostSchema } from './schemas/post.schema';

/** No controller; registering the model builds the userId_1 index. */
@Module({
  imports: [MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }])],
  providers: [PostsRepository],
  exports: [PostsRepository],
})
export class PostsModule {}
