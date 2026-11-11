import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository, PageQuery, Stored } from '../common/database/base.repository';
import { scope, toObjectId } from '../common/database/object-id';
import { Paginated } from '../common/pagination/paginated';
import { Note } from './schemas/note.schema';

export interface NewNote {
  title: string;
  content: string;
  userId: Types.ObjectId;
}

export type NoteChanges = Partial<Pick<Note, 'title' | 'content'>>;

/**
 * Every notes query. "Visible" methods put the owner in the filter (undefined for admins),
 * so another user's note is never touched.
 */
@Injectable()
export class NotesRepository extends BaseRepository<Note> {
  constructor(@InjectModel(Note.name) model: Model<Note>) {
    super(model);
  }

  /** Index: userId_1__id_-1 for both the filter and the sort, and for the count. */
  listByOwner(ownerId: string, page: PageQuery): Promise<Paginated<Stored<Note>>> {
    return this.paginate({ userId: toObjectId(ownerId) }, page);
  }

  /** Index: _id (sort). Count from collection metadata. */
  listAll(page: PageQuery): Promise<Paginated<Stored<Note>>> {
    return this.paginate({}, page);
  }

  createNote(note: NewNote): Promise<Stored<Note>> {
    return this.create(note);
  }

  /** Index: _id. */
  findVisible(id: string, ownerId?: string): Promise<Stored<Note> | null> {
    return this.findOne(scope(id, ownerId));
  }

  /** null when there is no such note visible to the caller. */
  updateVisible(id: string, ownerId: string | undefined, changes: NoteChanges): Promise<Stored<Note> | null> {
    return this.updateOne(scope(id, ownerId), { $set: changes });
  }

  /** false when there is no such note visible to the caller. */
  deleteVisible(id: string, ownerId?: string): Promise<boolean> {
    return this.deleteOne(scope(id, ownerId));
  }

  /** Index: userId_1__id_-1 (prefix). Used when a user is deleted. */
  deleteAllByOwner(ownerId: string): Promise<number> {
    return this.deleteMany({ userId: toObjectId(ownerId) });
  }
}
