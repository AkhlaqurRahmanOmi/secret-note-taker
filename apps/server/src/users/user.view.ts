import { ApiProperty } from '@nestjs/swagger';
import type { Types } from 'mongoose';
import type { PublicUser } from './public-user';
import { Role } from './role.enum';
import type { InterestGroup, PostWithAuthor } from './users.repository';

// API reference shapes.

const OBJECT_ID = { type: String, example: '6650c0ffee0000000000a001' } as const;

/** A user as returned; never has a password. */
export class UserView implements PublicUser {
  @ApiProperty(OBJECT_ID)
  _id!: Types.ObjectId;
  name!: string;
  /** Stored lowercase. */
  email!: string;
  role!: Role;
  /** Stored trimmed, lowercase and without duplicates. */
  interests!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class GroupMemberView {
  @ApiProperty(OBJECT_ID)
  _id!: Types.ObjectId;
  name!: string;
  email!: string;
}

export class InterestGroupView implements InterestGroup {
  /** The interest shared by this group's users. */
  interest!: string;
  /** How many users have it; groups are sorted by this, largest first. */
  count!: number;
  users!: GroupMemberView[];
}

export class PostAuthorView {
  @ApiProperty(OBJECT_ID)
  _id!: Types.ObjectId;
  name!: string;
  /** Admins only. */
  email?: string;
}

export class PostWithAuthorView implements PostWithAuthor {
  @ApiProperty({ ...OBJECT_ID, example: '6650c0ffee0000000000b001' })
  _id!: Types.ObjectId;
  title!: string;
  content!: string;
  createdAt!: Date;
  updatedAt!: Date;
  author!: PostAuthorView;
}
