import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotesController } from './notes.controller';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';
import { Note, NoteSchema } from './schemas/note.schema';

/** Exports NotesRepository for the cascade delete. */
@Module({
  imports: [MongooseModule.forFeature([{ name: Note.name, schema: NoteSchema }])],
  controllers: [NotesController],
  providers: [NotesRepository, NotesService],
  exports: [NotesRepository],
})
export class NotesModule {}
