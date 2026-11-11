import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { BaseRepository, PageQuery, Stored } from '../common/database/base.repository';
import { toObjectId } from '../common/database/object-id';
import { Paginated } from '../common/pagination/paginated';
import { Post } from '../posts/schemas/post.schema';
import { PublicUser } from './public-user';
import { User } from './schemas/user.schema';

export type NewUser = Pick<User, 'name' | 'email' | 'password' | 'role' | 'interests'>;

export type UserChanges = Partial<Pick<User, 'name' | 'interests' | 'role'>>;

/** What a request needs about its caller. */
export type AuthRecord = Pick<Stored<User>, '_id' | 'role'>;

/** One interest and the users who have it. */
export interface InterestGroup {
  interest: string;
  count: number;
  users: { _id: Types.ObjectId; name: string; email: string }[];
}

/** A post with its author; `email` only for admins. */
export type PostWithAuthor = Omit<Stored<Post>, 'userId'> & {
  author: { _id: Types.ObjectId; name: string; email?: string };
};

/** What `$facet` returns: the page and a one-element count. */
interface Faceted<T> {
  data: T[];
  total: { count: number }[];
}

/** Every users query. Each method names the index it uses. */
@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(@InjectModel(User.name) model: Model<User>) {
    super(model);
  }

  /** Index: email_1. Login only; the one read that includes the password hash. */
  findByEmailWithPassword(email: string): Promise<Stored<User> | null> {
    return this.findOne({ email }, '+password');
  }

  /** Index: _id. Runs on every request, so it loads only the role. */
  findAuthById(id: string): Promise<AuthRecord | null> {
    return this.findOne({ _id: toObjectId(id) }, { role: 1 });
  }

  /** Index: _id. */
  findPublicById(id: string): Promise<PublicUser | null> {
    return this.findOne({ _id: toObjectId(id) });
  }

  /** Index: _id (sort). Count from collection metadata. */
  listUsers(page: PageQuery): Promise<Paginated<PublicUser>> {
    return this.paginate({}, page);
  }

  /** A duplicate email fails on the unique index (409 EMAIL_TAKEN), with no race. */
  async createUser(user: NewUser): Promise<PublicUser> {
    return this.create(user);
  }

  /** Index: _id. null when there is no such user. */
  updateUser(id: string, changes: UserChanges): Promise<PublicUser | null> {
    return this.updateOne({ _id: toObjectId(id) }, { $set: changes });
  }

  /** Index: _id. false when there is no such user. */
  deleteUser(id: string): Promise<boolean> {
    return this.deleteOne({ _id: toObjectId(id) });
  }

  /**
   * Users grouped by interest, largest group first. One aggregate call; `$facet` gives the
   * page and the total. With an interest, the first `$match` uses interests_1; without one,
   * every user is grouped (COLLSCAN).
   */
  async groupByInterests(interest: string | undefined, { page, limit }: PageQuery): Promise<Paginated<InterestGroup>> {
    const byInterest: PipelineStage[] = interest === undefined ? [] : [{ $match: { interests: interest } }];
    const [result] = await this.aggregate<Faceted<InterestGroup>>([
      ...byInterest,
      { $unwind: '$interests' },
      ...byInterest, // drop the matched users' other interests
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);
    return new Paginated(result.data, { page, limit, total: result.total[0]?.count ?? 0 });
  }

  /**
   * One user's posts, newest first: `$match` by _id, then `$lookup` on posts (userId_1),
   * paginated inside the lookup. null when the user doesn't exist.
   */
  async findPostsByAuthor(
    id: string,
    { page, limit }: PageQuery,
    { includeEmail }: { includeEmail: boolean },
  ): Promise<Paginated<PostWithAuthor> | null> {
    const author = { _id: '$_id', name: '$name', ...(includeEmail && { email: '$email' }) };
    const [result] = await this.aggregate<{ data: PostWithAuthor[]; total: number }>([
      { $match: { _id: toObjectId(id) } },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'userId',
          let: { author },
          pipeline: [
            // Same order as { _id: -1 } (userId is fixed here), but it stops the planner
            // picking a full _id index scan, so userId_1 is always used.
            { $sort: { userId: 1, _id: -1 } },
            {
              $facet: {
                data: [
                  { $skip: (page - 1) * limit },
                  { $limit: limit },
                  { $project: { userId: 0 } },
                  { $addFields: { author: '$$author' } },
                ],
                total: [{ $count: 'count' }],
              },
            },
          ],
          as: 'posts',
        },
      },
      {
        $project: {
          _id: 0,
          data: { $first: '$posts.data' },
          total: { $ifNull: [{ $first: { $first: '$posts.total.count' } }, 0] },
        },
      },
    ]);
    return result ? new Paginated(result.data, { page, limit, total: result.total }) : null;
  }
}
