import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/database/base.repository';
import { toObjectId } from '../common/database/object-id';
import { Post } from './schemas/post.schema';

/** Posts are read via $lookup from users; this only deletes them. */
@Injectable()
export class PostsRepository extends BaseRepository<Post> {
  constructor(@InjectModel(Post.name) model: Model<Post>) {
    super(model);
  }

  /** Index: userId_1. */
  deleteAllByOwner(ownerId: string): Promise<number> {
    return this.deleteMany({ userId: toObjectId(ownerId) });
  }
}
