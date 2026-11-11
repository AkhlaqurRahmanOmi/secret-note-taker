import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { CONFIG_OPTIONS } from './config/config-options';
import { mongooseOptions } from './config/mongoose-options';
import { NotesModule } from './notes/notes.module';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot(CONFIG_OPTIONS),
    MongooseModule.forRootAsync({ inject: [ConfigService], useFactory: mongooseOptions }),
    AuthModule,
    UsersModule,
    NotesModule,
    PostsModule,
  ],
})
export class AppModule {}
