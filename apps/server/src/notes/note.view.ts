import { ApiProperty } from '@nestjs/swagger';
import type { Types } from 'mongoose';
import type { Stored } from '../common/database/base.repository';
import type { Note } from './schemas/note.schema';

/** A note as returned. */
export class NoteView implements Stored<Note> {
  @ApiProperty({ type: String, example: '6650c0ffee0000000000abcd' })
  _id!: Types.ObjectId;
  title!: string;
  content!: string;
  /** The owner; can't be changed. */
  @ApiProperty({ type: String, example: '6650c0ffee0000000000a001' })
  userId!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;
}
