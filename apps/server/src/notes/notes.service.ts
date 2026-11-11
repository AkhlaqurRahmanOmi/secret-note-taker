import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/types/auth-user';
import { PageQuery, Stored } from '../common/database/base.repository';
import { toObjectId } from '../common/database/object-id';
import { DomainException } from '../common/errors/domain.exception';
import { ErrorCode } from '../common/errors/error-code';
import { Paginated } from '../common/pagination/paginated';
import { definedOnly } from '../common/utils/defined-only';
import { Role } from '../users/role.enum';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesRepository } from './notes.repository';
import { Note } from './schemas/note.schema';

/** Someone else's note is a 404, like a missing one, so ids can't be probed. */
@Injectable()
export class NotesService {
  constructor(private readonly notes: NotesRepository) {}

  list(caller: AuthUser, page: PageQuery): Promise<Paginated<Stored<Note>>> {
    return caller.role === Role.Admin ? this.notes.listAll(page) : this.notes.listByOwner(caller.id, page);
  }

  /** The owner is always the caller. */
  create(caller: AuthUser, dto: CreateNoteDto): Promise<Stored<Note>> {
    return this.notes.createNote({ title: dto.title, content: dto.content, userId: toObjectId(caller.id) });
  }

  async get(caller: AuthUser, id: string): Promise<Stored<Note>> {
    return (await this.notes.findVisible(id, this.ownerScope(caller))) ?? this.notFound();
  }

  async update(caller: AuthUser, id: string, dto: UpdateNoteDto): Promise<Stored<Note>> {
    const changes = definedOnly(dto, ['title', 'content']);
    return (await this.notes.updateVisible(id, this.ownerScope(caller), changes)) ?? this.notFound();
  }

  async remove(caller: AuthUser, id: string): Promise<void> {
    if (!(await this.notes.deleteVisible(id, this.ownerScope(caller)))) this.notFound();
  }

  /** The caller's id, or none for an admin. */
  private ownerScope(caller: AuthUser): string | undefined {
    return caller.role === Role.Admin ? undefined : caller.id;
  }

  private notFound(): never {
    throw new DomainException(ErrorCode.NOTE_NOT_FOUND);
  }
}
