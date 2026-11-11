import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export const POST_TITLE_MAX = 200;
export const POST_CONTENT_MAX = 50_000;

/** Public posts. No CRUD; created by the seed and read through $lookup from users. */
@Schema({ collection: 'posts', timestamps: true, versionKey: false, strictQuery: 'throw' })
export class Post {
  @Prop({ required: true, trim: true, maxlength: POST_TITLE_MAX })
  title!: string;

  @Prop({ required: true, maxlength: POST_CONTENT_MAX })
  content!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, immutable: true })
  userId!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// ── Indexes ───────────────────────────────────────────────────────────────────────────

/** The `$lookup` foreign field: a seek per user instead of scanning all posts. */
PostSchema.index({ userId: 1 });
