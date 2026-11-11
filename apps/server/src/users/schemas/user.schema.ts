import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../role.enum';

export const USER_NAME_MAX = 100;
export const USER_EMAIL_MAX = 254; // the longest valid address (RFC 5321)
export const INTEREST_MAX = 50;

/** Strips the password hash; `select: false` doesn't cover documents from create(). */
function withoutPassword(_doc: unknown, ret: Record<string, unknown>) {
  delete ret['password'];
  return ret;
}

@Schema({
  collection: 'users',
  timestamps: true,
  versionKey: false,
  strictQuery: 'throw', // unknown filter fields throw instead of being dropped
  toJSON: { transform: withoutPassword },
  toObject: { transform: withoutPassword },
})
export class User {
  @Prop({ required: true, trim: true, maxlength: USER_NAME_MAX })
  name!: string;

  // Unique via UserSchema.index() below, not here.
  @Prop({ required: true, lowercase: true, trim: true, maxlength: USER_EMAIL_MAX })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ type: String, required: true, enum: Object.values(Role), default: Role.User })
  role!: Role;

  // Normalised on write, so "Chess" and "chess" are one interest.
  @Prop({ type: [{ type: String, lowercase: true, trim: true, maxlength: INTEREST_MAX }], default: [] })
  interests!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ── Indexes ───────────────────────────────────────────────────────────────────────────

/** Login lookup, and unique emails. */
UserSchema.index({ email: 1 }, { unique: true });

/** Grouped-by-interests `$match` when ?interest= is given (multikey). */
UserSchema.index({ interests: 1 });
