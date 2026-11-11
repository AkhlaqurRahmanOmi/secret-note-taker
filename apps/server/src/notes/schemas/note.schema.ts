import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export const NOTE_TITLE_MAX = 200;
export const NOTE_CONTENT_MAX = 50_000;

// strictQuery 'throw': a typo like { ownerId } fails instead of matching every note.
@Schema({ collection: 'notes', timestamps: true, versionKey: false, strictQuery: 'throw' })
export class Note {
  @Prop({ required: true, trim: true, maxlength: NOTE_TITLE_MAX })
  title!: string;

  @Prop({ required: true, maxlength: NOTE_CONTENT_MAX })
  content!: string;

  // A note can never move to another owner.
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, immutable: true })
  userId!: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

// ── Indexes ───────────────────────────────────────────────────────────────────────────

/** A user's notes, newest first: filter and sort from one index, no in-memory sort. */
NoteSchema.index({ userId: 1, _id: -1 });
