import { Types } from 'mongoose';

/** Ids are already validated by ParseObjectIdPipe or come from a verified token. */
export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/** The filter for one owned document: `{ _id }` for an admin, `{ _id, userId }` for everyone else. */
export interface OwnedFilter {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
}

export function scope(id: string, ownerId?: string): OwnedFilter {
  return ownerId ? { _id: toObjectId(id), userId: toObjectId(ownerId) } : { _id: toObjectId(id) };
}
