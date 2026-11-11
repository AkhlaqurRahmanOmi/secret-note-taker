import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/validation/transforms';
import { NOTE_CONTENT_MAX, NOTE_TITLE_MAX } from '../schemas/note.schema';

/** No `userId`: the owner is always the caller. */
export class CreateNoteDto {
  @MaxLength(NOTE_TITLE_MAX)
  @IsNotEmpty({ message: 'title is required' })
  @IsString()
  @Transform(trim)
  title!: string;

  @MaxLength(NOTE_CONTENT_MAX)
  @IsNotEmpty({ message: 'content is required' })
  @IsString()
  content!: string;
}
