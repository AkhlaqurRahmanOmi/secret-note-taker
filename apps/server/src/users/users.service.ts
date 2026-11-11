import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../auth/hashing/password-hasher';
import { AuthUser } from '../auth/types/auth-user';
import { PageQuery } from '../common/database/base.repository';
import { toObjectId } from '../common/database/object-id';
import { DomainException } from '../common/errors/domain.exception';
import { ErrorCode } from '../common/errors/error-code';
import { Paginated } from '../common/pagination/paginated';
import { definedOnly } from '../common/utils/defined-only';
import { NotesRepository } from '../notes/notes.repository';
import { PostsRepository } from '../posts/posts.repository';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser } from './public-user';
import { Role } from './role.enum';
import { InterestGroup, PostWithAuthor, UsersRepository } from './users.repository';

/**
 * Role checks live in the guards; this enforces rules about the target user. An admin can't
 * change their own role or delete themselves, so one admin always remains.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly notes: NotesRepository,
    private readonly posts: PostsRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async me(caller: AuthUser): Promise<PublicUser> {
    return (await this.users.findPublicById(caller.id)) ?? this.notFound();
  }

  async updateMe(caller: AuthUser, dto: UpdateUserDto): Promise<PublicUser> {
    return (await this.users.updateUser(caller.id, definedOnly(dto, ['name', 'interests']))) ?? this.notFound();
  }

  list(page: PageQuery): Promise<Paginated<PublicUser>> {
    return this.users.listUsers(page);
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    return this.users.createUser({
      name: dto.name,
      email: dto.email,
      password: await this.hasher.hash(dto.password),
      role: dto.role ?? Role.User,
      interests: dto.interests ?? [],
    });
  }

  async get(id: string): Promise<PublicUser> {
    return (await this.users.findPublicById(id)) ?? this.notFound();
  }

  /** An admin may not change their own role. */
  async update(caller: AuthUser, id: string, dto: AdminUpdateUserDto): Promise<PublicUser> {
    if (this.isSelf(caller, id) && dto.role !== undefined && dto.role !== caller.role) {
      throw new DomainException(ErrorCode.CANNOT_DEMOTE_SELF);
    }
    return (await this.users.updateUser(id, definedOnly(dto, ['name', 'interests', 'role']))) ?? this.notFound();
  }

  /**
   * Notes and posts first, the user last: without a transaction, a retry can finish a
   * half-done delete and no orphans are left.
   */
  async remove(caller: AuthUser, id: string): Promise<void> {
    if (this.isSelf(caller, id)) throw new DomainException(ErrorCode.CANNOT_DELETE_SELF);
    await this.notes.deleteAllByOwner(id);
    await this.posts.deleteAllByOwner(id);
    if (!(await this.users.deleteUser(id))) this.notFound();
  }

  groupByInterests(interest: string | undefined, page: PageQuery): Promise<Paginated<InterestGroup>> {
    return this.users.groupByInterests(interest, page);
  }

  /** The author's email is shown to admins only. */
  async postsOf(caller: AuthUser, id: string, page: PageQuery): Promise<Paginated<PostWithAuthor>> {
    const result = await this.users.findPostsByAuthor(id, page, { includeEmail: caller.role === Role.Admin });
    return result ?? this.notFound();
  }

  /** Compared as ObjectIds, since URL ids may be upper-case hex. */
  private isSelf(caller: AuthUser, id: string): boolean {
    return toObjectId(id).equals(caller.id);
  }

  private notFound(): never {
    throw new DomainException(ErrorCode.USER_NOT_FOUND);
  }
}
