/**
 * `yarn seed`: wipes users, notes and posts, syncs indexes to the schemas and inserts the
 * demo data. Uses AppModule, so config, schemas and hashing match the API.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { Connection, Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { PasswordHasher } from '../auth/hashing/password-hasher';
import type { Env } from '../config/env.validation';
import { Note } from '../notes/schemas/note.schema';
import { Post } from '../posts/schemas/post.schema';
import { User } from '../users/schemas/user.schema';
import { ADMIN_PASSWORD, SEED_NOTES, SEED_POSTS, SEED_USERS, SeedEntry, USER_PASSWORD } from './seed-data';

const logger = new Logger('Seed');

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const connection = app.get<Connection>(getConnectionToken());
    const dbName = app.get<ConfigService<Env, true>>(ConfigService).get('MONGODB_DB_NAME', { infer: true });
    const users = app.get<Model<User>>(getModelToken(User.name));
    const notes = app.get<Model<Note>>(getModelToken(Note.name));
    const posts = app.get<Model<Post>>(getModelToken(Post.name));
    const hasher = app.get(PasswordHasher);

    // Host and database name only: the URI carries credentials.
    console.log(`Seeding ${connection.host}/${dbName}\n`);

    // deleteMany, not dropDatabase, which would drop the indexes too.
    await Promise.all([notes.deleteMany({}), posts.deleteMany({}), users.deleteMany({})]);

    // Build missing indexes and drop undeclared ones.
    for (const model of [users, notes, posts]) {
      const dropped = await model.syncIndexes();
      if (dropped.length) console.log(`Dropped undeclared indexes on ${model.collection.name}: ${dropped.join(', ')}`);
    }

    const created = await users.insertMany(
      await Promise.all(SEED_USERS.map(async (u) => ({ ...u, password: await hasher.hash(u.password) }))),
    );
    const idByEmail = new Map(created.map((u) => [u.email, u._id]));
    const owned = (entries: SeedEntry[]) =>
      entries.map(({ owner, title, content }) => ({ title, content, userId: ownerId(idByEmail, owner) }));
    // Inserted in array order, so newest-first follows seed-data.ts.
    await notes.insertMany(owned(SEED_NOTES));
    await posts.insertMany(owned(SEED_POSTS));

    const [userCount, noteCount, postCount] = await Promise.all([
      users.countDocuments(),
      notes.countDocuments(),
      posts.countDocuments(),
    ]);
    console.log(`Inserted ${userCount} users, ${noteCount} notes, ${postCount} posts.\n`);

    console.log('Indexes (listIndexes):');
    for (const model of [users, notes, posts]) {
      for (const index of await model.collection.listIndexes().toArray()) {
        console.log(`  ${model.collection.name.padEnd(6)} ${index['name'].padEnd(18)} ${JSON.stringify(index['key'])}${index['unique'] ? ' unique' : ''}`);
      }
    }

    const maya = idByEmail.get('maya@example.com');
    const mayaPosts = SEED_POSTS.filter((p) => p.owner === 'maya@example.com').length;
    console.log(`
Demo logins (test values only):
  admin  admin@example.com  ${ADMIN_PASSWORD}
  user   maya@example.com   ${USER_PASSWORD}   (every other demo user: <first name>@example.com, same password)

Try:
  Grouped by interest  GET /api/users/grouped-by-interests?interest=chess   (as admin)
  Posts of a user      GET /api/users/${maya}/posts   (Maya, ${mayaPosts} posts)
`);
  } finally {
    await app.close();
  }
}

function ownerId(idByEmail: Map<string, Types.ObjectId>, email: string): Types.ObjectId {
  const id = idByEmail.get(email);
  if (!id) throw new Error(`seed-data.ts: no seed user with email ${email}`);
  return id;
}

seed().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
