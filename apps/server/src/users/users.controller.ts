import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData, ApiErrors, ApiPage } from '../common/docs/api-responses';
import { ErrorCode } from '../common/errors/error-code';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { Paginated } from '../common/pagination/paginated';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { GroupedByInterestsQueryDto } from './dto/grouped-by-interests-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PublicUser } from './public-user';
import { Role } from './role.enum';
import type { InterestGroup, PostWithAuthor } from './users.repository';
import { InterestGroupView, PostWithAuthorView, UserView } from './user.view';
import { UsersService } from './users.service';

/**
 * Admin only by default; method-level @Roles opens /me and posts to every user. Static
 * paths stay above `:id`.
 */
@ApiTags('users')
@ApiBearerAuth('bearer')
@ApiErrors(ErrorCode.UNAUTHENTICATED, ErrorCode.TOKEN_EXPIRED)
@Controller('users')
@Roles(Role.Admin)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: 'My profile', description: 'Any signed-in user.' })
  @ApiData(UserView)
  @Get('me')
  @Roles(Role.User, Role.Admin)
  me(@CurrentUser() caller: AuthUser): Promise<PublicUser> {
    return this.users.me(caller);
  }

  @ApiOperation({ summary: 'Update my profile', description: 'Any signed-in user. Name and interests only: `role`, `email` or `password` is a 400.' })
  @ApiData(UserView, HttpStatus.OK, 'The profile after the change')
  @ApiErrors(ErrorCode.VALIDATION_FAILED)
  @Patch('me')
  @Roles(Role.User, Role.Admin)
  updateMe(@CurrentUser() caller: AuthUser, @Body() dto: UpdateUserDto): Promise<PublicUser> {
    return this.users.updateMe(caller, dto);
  }

  @ApiOperation({
    summary: 'Users grouped by interest',
    description: 'Admin only. One aggregation: groups sorted by size, largest first; `meta` counts groups. `?interest=` returns just that group.',
  })
  @ApiPage(InterestGroupView, 'One page of groups')
  @ApiErrors(ErrorCode.FORBIDDEN, ErrorCode.VALIDATION_FAILED)
  @Get('grouped-by-interests')
  groupedByInterests(@Query() query: GroupedByInterestsQueryDto): Promise<Paginated<InterestGroup>> {
    return this.users.groupByInterests(query.interest, query);
  }

  @ApiOperation({ summary: 'List users', description: 'Admin only. Newest first.' })
  @ApiPage(UserView)
  @ApiErrors(ErrorCode.FORBIDDEN, ErrorCode.VALIDATION_FAILED)
  @Get()
  list(@Query() page: PaginationQueryDto): Promise<Paginated<PublicUser>> {
    return this.users.list(page);
  }

  @ApiOperation({ summary: 'Create a user', description: 'Admin only. `role` defaults to `user`.' })
  @ApiData(UserView, HttpStatus.CREATED, 'Created')
  @ApiErrors(ErrorCode.FORBIDDEN, ErrorCode.VALIDATION_FAILED, ErrorCode.EMAIL_TAKEN)
  @Post()
  create(@Body() dto: CreateUserDto): Promise<PublicUser> {
    return this.users.create(dto);
  }

  @ApiOperation({
    summary: "A user's posts",
    description: 'Any signed-in user. One aggregation from users with `$lookup` into posts, newest first. The author email is shown to admins only.',
  })
  @ApiPage(PostWithAuthorView)
  @ApiErrors(ErrorCode.VALIDATION_FAILED, ErrorCode.INVALID_ID, ErrorCode.USER_NOT_FOUND)
  @Get(':id/posts')
  @Roles(Role.User, Role.Admin)
  posts(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() page: PaginationQueryDto,
  ): Promise<Paginated<PostWithAuthor>> {
    return this.users.postsOf(caller, id, page);
  }

  @ApiOperation({ summary: 'Get a user', description: 'Admin only.' })
  @ApiData(UserView)
  @ApiErrors(ErrorCode.FORBIDDEN, ErrorCode.INVALID_ID, ErrorCode.USER_NOT_FOUND)
  @Get(':id')
  get(@Param('id', ParseObjectIdPipe) id: string): Promise<PublicUser> {
    return this.users.get(id);
  }

  @ApiOperation({ summary: 'Update a user', description: 'Admin only. The one place a role can change; you cannot change your own.' })
  @ApiData(UserView, HttpStatus.OK, 'The user after the change')
  @ApiErrors(ErrorCode.FORBIDDEN, ErrorCode.VALIDATION_FAILED, ErrorCode.INVALID_ID, ErrorCode.CANNOT_DEMOTE_SELF, ErrorCode.USER_NOT_FOUND)
  @Patch(':id')
  update(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<PublicUser> {
    return this.users.update(caller, id, dto);
  }

  @ApiOperation({ summary: 'Delete a user', description: "Admin only. Also deletes the user's notes and posts. You cannot delete yourself." })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Deleted; no body' })
  @ApiErrors(ErrorCode.FORBIDDEN, ErrorCode.INVALID_ID, ErrorCode.CANNOT_DELETE_SELF, ErrorCode.USER_NOT_FOUND)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() caller: AuthUser, @Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.users.remove(caller, id);
  }
}
