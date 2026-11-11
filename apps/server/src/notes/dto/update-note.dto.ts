import { PartialType } from '@nestjs/swagger';
import { CreateNoteDto } from './create-note.dto';

/** Create's rules, every field optional. */
export class UpdateNoteDto extends PartialType(CreateNoteDto) {}
