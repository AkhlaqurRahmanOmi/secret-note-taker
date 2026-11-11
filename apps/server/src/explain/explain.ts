/**
 * `yarn explain` (after `yarn seed`): calls each read-only repository method, captures the
 * commands it sends and re-runs them as `explain`. Exits 1 if a plan misses its expected
 * index; `--out <file>` writes the markdown report.
 */
import { writeFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { NotesRepository } from '../notes/notes.repository';
import { UsersRepository } from '../users/users.repository';
import { ExplainModule } from './explain.module';
import { bareCommand, Doc, PlanSummary, summarise, toText } from './plan-summary';

const QUERY_COMMANDS = new Set(['find', 'aggregate', 'count', 'findAndModify', 'update', 'delete']);

interface Case {
  title: string;
  source: string;
  /** Per command: index names (or COLLSCAN / metadata) its plan must contain. */
  expect: Record<string, string[]>;
  run: () => Promise<unknown>;
  note?: string;
}

interface Result {
  case: Case;
  commands: { name: string; command: Doc; summary: PlanSummary; ok: boolean; missing: string[] }[];
}

const logger = new Logger('Explain');

async function main(): Promise<void> {
  const outIndex = process.argv.indexOf('--out');
  const outFile = outIndex > -1 ? process.argv[outIndex + 1] : undefined;

  const app = await NestFactory.createApplicationContext(ExplainModule, { logger: ['error', 'warn'] });
  try {
    const connection = app.get<Connection>(getConnectionToken());
    const db = connection.db;
    if (!db) throw new Error('Not connected');
    const users = app.get(UsersRepository);
    const notes = app.get(NotesRepository);

    // Seed fixtures: a user with notes and posts, and one of her notes.
    const maya = await users.findByEmailWithPassword('maya@example.com');
    if (!maya) throw new Error('No seed data: run `yarn seed` first.');
    const mayaId = String(maya._id);
    const mayaNote = (await notes.listByOwner(mayaId, { page: 1, limit: 1 })).data[0];
    const page = { page: 1, limit: 10 };

    const cases: Case[] = [
      {
        title: 'Login: find a user by email (with the password hash)',
        source: 'UsersRepository.findByEmailWithPassword',
        expect: { find: ['email_1'] },
        run: () => users.findByEmailWithPassword('maya@example.com'),
      },
      {
        title: "Every authenticated request: load the caller's role",
        source: 'UsersRepository.findAuthById (JwtStrategy)',
        expect: { find: ['_id_'] },
        run: () => users.findAuthById(mayaId),
      },
      {
        title: 'GET /notes as a user: own notes, newest first, page 1',
        source: 'NotesRepository.listByOwner',
        expect: { find: ['userId_1__id_-1'], aggregate: ['userId_1__id_-1'] },
        run: () => notes.listByOwner(mayaId, page),
        note: 'The page and its count run in parallel; both use the compound index. No SORT stage: the index order is the sort.',
      },
      {
        title: 'GET /notes as a user: page 3 of size 2',
        source: 'NotesRepository.listByOwner',
        expect: { find: ['userId_1__id_-1'], aggregate: ['userId_1__id_-1'] },
        run: () => notes.listByOwner(mayaId, { page: 3, limit: 2 }),
        note: 'SKIP sits below FETCH: skipped entries are index keys only, never loaded documents.',
      },
      {
        title: 'GET /notes/:id as a user: one note, owner in the filter',
        source: 'NotesRepository.findVisible',
        expect: { find: ['_id_'] },
        run: () => notes.findVisible(String(mayaNote._id), mayaId),
      },
      {
        title: 'GET /notes as an admin: every note, newest first',
        source: 'NotesRepository.listAll',
        expect: { find: ['_id_'], count: ['metadata'] },
        run: () => notes.listAll(page),
        note: 'Sorted on the built-in _id index; counted from collection metadata (estimatedDocumentCount).',
      },
      {
        title: 'GET /users as an admin: every user, newest first',
        source: 'UsersRepository.listUsers',
        expect: { find: ['_id_'], count: ['metadata'] },
        run: () => users.listUsers(page),
      },
      {
        title: 'Users grouped by interest, ?interest=chess',
        source: 'UsersRepository.groupByInterests',
        expect: { aggregate: ['interests_1'] },
        run: () => users.groupByInterests('chess', page),
        note: 'One aggregate command; $facet gives the total. Only users with the interest are read.',
      },
      {
        title: 'Users grouped by interest, no filter',
        source: 'UsersRepository.groupByInterests',
        expect: { aggregate: ['COLLSCAN'] },
        run: () => users.groupByInterests(undefined, page),
        note: 'Expected: grouping every user reads every user.',
      },
      {
        title: "A user's posts: $lookup from users",
        source: 'UsersRepository.findPostsByAuthor',
        expect: { aggregate: ['_id_', 'userId_1'] },
        run: () => users.findPostsByAuthor(mayaId, page, { includeEmail: true }),
        note: 'One user by _id, then posts { userId: 1 } for the join: only that user\'s posts are read.',
      },
    ];

    const captured: { name: string; command: Doc }[] = [];
    let capturing = false;
    const client = connection.getClient();
    client.on('commandStarted', (event) => {
      if (capturing && QUERY_COMMANDS.has(event.commandName)) captured.push({ name: event.commandName, command: event.command as Doc });
    });

    const results: Result[] = [];
    for (const c of cases) {
      captured.length = 0;
      capturing = true;
      await c.run();
      capturing = false;
      const commands = [];
      for (const { name, command } of [...captured]) {
        const explain = (await db.command({ explain: bareCommand(command), verbosity: 'executionStats' })) as Doc;
        const summary = summarise(explain);
        const missing = (c.expect[name] ?? ['<unexpected command>']).filter((x) => !summary.access.includes(x));
        commands.push({ name, command: bareCommand(command), summary, ok: missing.length === 0, missing });
      }
      const sent = new Set(commands.map((x) => x.name));
      for (const name of Object.keys(c.expect)) {
        if (!sent.has(name)) commands.push({ name, command: {}, summary: summarise({}), ok: false, missing: [`no ${name} command sent`] });
      }
      results.push({ case: c, commands });
    }

    const info = (await db.admin().serverInfo()) as Doc;
    const counts = Object.fromEntries(
      await Promise.all(['users', 'notes', 'posts'].map(async (n) => [n, await db.collection(n).estimatedDocumentCount()])),
    );
    const report = render(results, String(info['version']), counts);
    console.log(report);
    if (outFile) {
      writeFileSync(outFile, report);
      console.log(`Written to ${outFile}`);
    }
    const failed = results.flatMap((r) => r.commands).filter((x) => !x.ok).length;
    if (failed) {
      logger.error(`${failed} command(s) did not use the expected index.`);
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

function render(results: Result[], version: string, counts: Record<string, number>): string {
  const lines: string[] = [
    '# explain() evidence',
    '',
    `Generated by \`yarn explain\` against the seed data (${counts['users']} users, ${counts['notes']} notes, ${counts['posts']} posts), MongoDB ${version}.`,
    'Each command is captured from the real repository method and re-run as `explain` with `executionStats`.',
    '',
    '| Query | Command | Access | Keys | Docs | Returned | Check |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const r of results) {
    for (const c of r.commands) {
      const access = [...new Set(c.summary.access)].join(', ') || 'n/a';
      lines.push(
        `| ${r.case.title} | \`${c.name}\` | ${access}${c.summary.blockingSort ? ' + SORT' : ''} | ${c.summary.keysExamined ?? ''} | ${c.summary.docsExamined ?? ''} | ${c.summary.nReturned ?? ''} | ${c.ok ? 'ok' : `**missing ${c.missing.join(', ')}**`} |`,
      );
    }
  }
  for (const r of results) {
    lines.push('', `## ${r.case.title}`, '', `\`${r.case.source}\``, '');
    if (r.case.note) lines.push(r.case.note, '');
    for (const c of r.commands) {
      lines.push('```text', `${c.name} ${toText(stripNoise(c.command))}`, '', ...c.summary.tree);
      lines.push(
        '',
        `nReturned=${c.summary.nReturned ?? '-'} totalKeysExamined=${c.summary.keysExamined ?? '-'} totalDocsExamined=${c.summary.docsExamined ?? '-'} executionTimeMillis=${c.summary.millis ?? '-'}`,
        '```',
      );
    }
  }
  return lines.join('\n') + '\n';
}

function stripNoise(command: Doc): Doc {
  const { find, aggregate, count, filter, query, projection, sort, skip, limit, pipeline } = command;
  return Object.fromEntries(
    Object.entries({ find, aggregate, count, filter, query, projection, sort, skip, limit, pipeline }).filter(([, v]) => v !== undefined),
  );
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
