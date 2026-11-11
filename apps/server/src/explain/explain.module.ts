import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CONFIG_OPTIONS } from '../config/config-options';
import type { Env } from '../config/env.validation';
import { mongooseOptions } from '../config/mongoose-options';
import { NotesModule } from '../notes/notes.module';
import { PostsModule } from '../posts/posts.module';
import { UsersModule } from '../users/users.module';

/** The API's config and repositories, with command monitoring on. */
@Module({
  imports: [
    ConfigModule.forRoot(CONFIG_OPTIONS),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({ ...mongooseOptions(config), monitorCommands: true }),
    }),
    UsersModule,
    NotesModule,
    PostsModule,
  ],
})
export class ExplainModule {}
