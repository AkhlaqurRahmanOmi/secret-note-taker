import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData, ApiErrors, ApiPage } from '../common/docs/api-responses';
import { ErrorCode } from '../common/errors/error-code';
import type { AuthUser } from '../auth/types/auth-user';
import { Stored } from '../common/database/base.repository';
import { Paginated } from '../common/pagination/paginated';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';
import { NoteView } from './note.view';
import { Note } from './schemas/note.schema';

/** Any signed-in user; NotesService scopes non-admins to their own notes. */
@ApiTags('notes')
@ApiBearerAuth('bearer')
@ApiErrors(ErrorCode.UNAUTHENTICATED, ErrorCode.TOKEN_EXPIRED)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @ApiOperation({ summary: 'List notes', description: 'Your notes, newest first. Admins get every note.' })
  @ApiPage(NoteView)
  @ApiErrors(ErrorCode.VALIDATION_FAILED)
  @Get()
  list(@CurrentUser() caller: AuthUser, @Query() page: PaginationQueryDto): Promise<Paginated<Stored<Note>>> {
    return this.notes.list(caller, page);
  }

  @ApiOperation({ summary: 'Create a note', description: 'The owner is always the caller.' })
  @ApiData(NoteView, HttpStatus.CREATED, 'Created')
  @ApiErrors(ErrorCode.VALIDATION_FAILED)
  @Post()
  create(@CurrentUser() caller: AuthUser, @Body() dto: CreateNoteDto): Promise<Stored<Note>> {
    return this.notes.create(caller, dto);
  }

  @ApiOperation({ summary: 'Get a note', description: "Someone else's note is a 404, like a missing one (admins excepted)." })
  @ApiData(NoteView)
  @ApiErrors(ErrorCode.INVALID_ID, ErrorCode.NOTE_NOT_FOUND)
  @Get(':id')
  get(@CurrentUser() caller: AuthUser, @Param('id', ParseObjectIdPipe) id: string): Promise<Stored<Note>> {
    return this.notes.get(caller, id);
  }

  @ApiOperation({ summary: 'Update a note', description: 'Send only the fields to change. The owner cannot be changed.' })
  @ApiData(NoteView, HttpStatus.OK, 'The note after the change')
  @ApiErrors(ErrorCode.VALIDATION_FAILED, ErrorCode.INVALID_ID, ErrorCode.NOTE_NOT_FOUND)
  @Patch(':id')
  update(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<Stored<Note>> {
    return this.notes.update(caller, id, dto);
  }

  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Deleted; no body' })
  @ApiErrors(ErrorCode.INVALID_ID, ErrorCode.NOTE_NOT_FOUND)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() caller: AuthUser, @Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.notes.remove(caller, id);
  }
}
