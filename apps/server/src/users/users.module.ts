import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HashingModule } from '../auth/hashing/hashing.module';
import { NotesModule } from '../notes/notes.module';
import { PostsModule } from '../posts/posts.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

/** Notes and Posts are imported for the cascade delete. */
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), HashingModule, NotesModule, PostsModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository],
})
export class UsersModule {}
