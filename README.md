# Secure Notes API

A note-taking API with private notes, public posts, and role-based access. NestJS 11 and
Mongoose 9 on MongoDB, JWT auth, bcrypt passwords, in an Nx monorepo with a small React client.

- `apps/server`: the API (graded part)
- `apps/note-client`: React 19 + Vite frontend (deliberately minimal, see [Frontend](#frontend))

Quick links: [Demo accounts](#demo-accounts) · [Indexes](#indexes) · [explain() output](#explain-output) ·
[Aggregations](#aggregations) · [Setup](#setup) · [API](#api) · [curl walkthrough](#try-it-with-curl) ·
[Known limits](#known-limits)

---

## Demo accounts

`yarn seed` creates these accounts (see [Setup](#setup)). They are test values only, on
reserved `example.com` addresses.

| Role | Email | Password | Seeded data |
|---|---|---|---|
| **admin** | `admin@example.com` | `admin-demo-pass` | 2 notes, no posts |
| user | `maya@example.com` | `user-demo-pass` | 6 notes, 5 posts |
| user | `liam@example.com` | `user-demo-pass` | 4 notes, 3 posts |
| user | `sofia@example.com` | `user-demo-pass` | 3 notes, 3 posts |
| user | `noah@example.com` | `user-demo-pass` | 3 notes, 2 posts |
| user | `ava@example.com` | `user-demo-pass` | 3 notes, 2 posts |
| user | `ethan@example.com` | `user-demo-pass` | 2 notes, no posts |
| user | `zara@example.com` | `user-demo-pass` | 3 notes, 2 posts |
| user | `lucas@example.com` | `user-demo-pass` | 2 notes, 2 posts |
| user | `mia@example.com` | `user-demo-pass` | 2 notes, 1 post |
| user | `omar@example.com` | `user-demo-pass` | no interests, notes or posts |

What to try:
- **As the admin:** every user's notes, the user list at `/admin/users` (change roles, delete
  users), and `GET /api/users/grouped-by-interests`.
- **As Maya:** only her own notes; her 5 posts at `GET /api/users/<her id>/posts`.
- **As a user:** another user's note is a `404`, and any admin route is a `403`.

To use them in the interactive API reference at <http://localhost:3000/api/docs>, sign in
with `POST /auth/login`, then paste the `accessToken` into its **Authentication** (bearer token)
field.

---

## Indexes

Exactly **four** indexes are declared, all with `schema.index()` in a block at the bottom of
each schema file. There is no `@Prop({ index: true })` or `@Prop({ unique: true })` anywhere:
those would create indexes invisibly and duplicate the explicit ones. Every query the API
makes lives in a repository method, and each method's comment names the index it uses.

| Index | Query it serves (repository method) | Why this index |
|---|---|---|
| `users { email: 1 }` **unique** | Login: `findOne({ email })` in `UsersRepository.findByEmailWithPassword` | Login is a point lookup by email. The unique constraint also makes duplicate sign-ups fail atomically (E11000 → `409 EMAIL_TAKEN`), with no race-prone check-then-insert. |
| `users { interests: 1 }` (multikey) | Scenario 1's `$match: { interests }` in `UsersRepository.groupByInterests`, when `?interest=` is given | Multikey: one index entry per array element, so the filter reads only users who have that interest. See [when it helps](#interests-when-the-index-helps). |
| `notes { userId: 1, _id: -1 }` | `GET /notes` for a user: `find({ userId }).sort({ _id: -1 }).skip().limit()` and `countDocuments({ userId })` in `NotesRepository.listByOwner`; also the `{ userId }` prefix for the cascade delete | Equality on `userId` *and* newest-first order from one index scan. A single-field `{ userId: 1 }` index would force a blocking in-memory SORT of every note the user has. |
| `posts { userId: 1 }` | Scenario 2's `$lookup` (`foreignField: 'userId'`) in `UsersRepository.findPostsByAuthor`; also `PostsRepository.deleteAllByOwner` | The join is a seek per looked-up user instead of a scan of every post. |

Everything else uses the built-in `_id` index: single documents by id (`IDHACK`/`EXPRESS_IXSCAN`),
the JWT strategy's per-request role lookup, and the admin "list everything" queries.

### Why sort on `_id`, not `createdAt`

An ObjectId starts with a 4-byte creation timestamp, so `sort({ _id: -1 })` is newest-first
without any extra index:

- The admin lists (all notes, all users) sort on the built-in `_id` index. Sorting on
  `createdAt` would need two more indexes, `notes { createdAt: -1 }` and `users { createdAt: -1 }`.
- The user's notes list gets filter and sort from one compound index, `{ userId: 1, _id: -1 }`.

**Caveat:** the timestamp has one-second resolution. Within the same second, ObjectIds are ordered
by a per-process counter, and ids made by different processes may not interleave in true creation
order. For a notes list that is irrelevant. It would matter for an audit log that needs exact order.

### `interests`: when the index helps

It helps **only** the filtered form of Scenario 1 (`?interest=chess`): the first `$match`
reads just the users with that interest (5 index keys and 5 documents for 5 chess players).

Without a filter the pipeline groups every user, which means reading every user: a `COLLSCAN`
no index can avoid. That plan is shown honestly [below](#explain-output) rather than hidden.

### Why `role` has no index

`role` has two values, so an index on it would split the collection in half and select nothing
useful. More to the point, no query filters on it. Role checks happen on a user that is already
loaded: `JwtStrategy` loads the caller by `_id` on every request, and `RolesGuard` compares
`role` in memory.

### Why no indexes for the admin lists or their counts

- **Sort:** the admin lists sort on the built-in `_id` index.
- **Count:** unfiltered lists use `estimatedDocumentCount()`, which reads collection metadata.
  `countDocuments({})` would scan every document instead.

Neither needs an index of its own.

Also not indexed: `title`, `content` (no query filters or sorts on them), `createdAt` and `updatedAt`
(the `_id` order replaces them).

### Scenario 2: why the `$lookup` sorts on `{ userId: 1, _id: -1 }`

Inside the `$lookup`, `userId` is fixed by the join's equality match. So sorting on
`{ userId: 1, _id: -1 }` gives exactly the same newest-first order as `{ _id: -1 }`, with one
difference: the `_id` index cannot provide it.

With a plain `{ _id: -1 }`, the planner may choose to walk the whole `_id` index and filter on
`userId`, avoiding the sort but reading every post. On test data where one user owned every post
it did exactly that (`indexesUsed: ["_id_"]`). MongoDB caches the winning plan per query shape,
so that plan would then be reused for every user. With the compound sort, `posts { userId: 1 }`
is the only candidate, and that user's posts are sorted in memory: a handful of documents.

---

## explain() output

`yarn explain` produces this. It calls each **real repository method**, captures the exact
command it sends to MongoDB (driver command monitoring), and re-runs that command as `explain`
with `executionStats`. So the plans are for what the code actually sends, not for a hand-copied
query that could drift from it.

Each case declares the index it must use, and the script exits 1 if any plan differs. It is a
regression check as well as evidence. Full output, with every plan and its index bounds:
[`apps/server/docs/explain.md`](apps/server/docs/explain.md).

Seed data (11 users, 30 notes, 20 posts) on MongoDB 8.0.37 (Atlas):

| Query | Command | Access | Keys | Docs | Returned |
|---|---|---|---|---|---|
| Login: user by email | `find` | `email_1` | 1 | 1 | 1 |
| Every authenticated request: the caller's role | `find` | `_id_` | 1 | 1 | 1 |
| `GET /notes` (user), page 1: page | `find` | `userId_1__id_-1` | 6 | 6 | 6 |
| `GET /notes` (user), page 1: total | `aggregate` | `userId_1__id_-1` (COUNT_SCAN) | 6 | **0** | 1 |
| `GET /notes` (user), page 3 of size 2 | `find` | `userId_1__id_-1` | 6 | **2** | 2 |
| `GET /notes/:id` (user) | `find` | `_id_` | 1 | 1 | 1 |
| `GET /notes` (admin): page / total | `find` / `count` | `_id_` / metadata | 10 / 0 | 10 / 0 | 10 |
| `GET /users` (admin): page / total | `find` / `count` | `_id_` / metadata | 10 / 0 | 10 / 0 | 10 |
| Scenario 1, `?interest=chess` | `aggregate` | `interests_1` | 5 | 5 | 5 |
| Scenario 1, no filter | `aggregate` | **COLLSCAN** (expected, see above) | 0 | 11 | 11 |
| Scenario 2 | `aggregate` | `_id_`, then `$lookup` on `userId_1` | 1 (+5) | 1 (+5) | 1 |

No plan contains a blocking `SORT` stage. Three plans in full:

**`GET /notes`, page 3 of size 2.** The `SKIP` sits below `FETCH`: skipped entries cost index
keys, never document loads (6 keys, 2 documents).

```text
find {"find":"notes","filter":{"userId":"ObjectId('6af44e396d5a605669f5da32')"},"sort":{"_id":-1},"skip":4,"limit":2}

LIMIT
  FETCH
    SKIP
      IXSCAN userId_1__id_-1 bounds {"userId":["[ObjectId('6af44e396d5a605669f5da32'), ObjectId('6af44e396d5a605669f5da32')]"],"_id":["[MaxKey, MinKey]"]}

nReturned=2 totalKeysExamined=6 totalDocsExamined=2 executionTimeMillis=0
```

**Scenario 1 with `?interest=chess`.** Only the 5 matching users are read:

```text
aggregate {"aggregate":"users","pipeline":[{"$match":{"interests":"chess"}},{"$unwind":"$interests"},{"$match":{"interests":"chess"}},{"$group":{"_id":"$interests","count":{"$sum":1},"users":{"$push":{"_id":"$_id","name":"$name","email":"$email"}}}},{"$sort":{"count":-1,"_id":1}},{"$facet":{"data":[{"$skip":0},{"$limit":10},{"$project":{"_id":0,"interest":"$_id","count":1,"users":1}}],"total":[{"$count":"count"}]}}]}

PROJECTION_SIMPLE
  FETCH
    IXSCAN interests_1 bounds {"interests":["[\"chess\", \"chess\"]"]}

nReturned=5 totalKeysExamined=5 totalDocsExamined=5 executionTimeMillis=0
```

**Scenario 2.** One user by `_id`; the join reads exactly that user's 5 posts (of 20) through
`userId_1`, with no collection scan:

```text
EXPRESS_IXSCAN _id_
$lookup posts indexesUsed=["userId_1"] collectionScans=0 totalKeysExamined=5 totalDocsExamined=5

nReturned=1 totalKeysExamined=1 totalDocsExamined=1 executionTimeMillis=0
```

---

## Aggregations

Both live in [`users.repository.ts`](apps/server/src/users/users.repository.ts).

### Scenario 1: `GET /users/grouped-by-interests?interest=&page=&limit=` (admin)

**Exactly one `aggregate()` call and no other database call**, including for pagination:
the page and the total number of groups both come out of `$facet`.

```text
$match   { interests: <interest> }      only with ?interest=  → IXSCAN interests_1
$unwind  "$interests"                   one document per (user, interest)
$match   { interests: <interest> }      again: drops the matched users' *other* interests,
                                        which would otherwise come back as extra groups
$group   { _id: "$interests", count: { $sum: 1 }, users: { $push: { _id, name, email } } }
$sort    { count: -1, _id: 1 }          biggest group first; name breaks ties, so pages are stable
$facet   { data: [ $skip, $limit, $project ], total: [ $count ] }
```

The pushed users contain only `_id`, `name` and `email`. The password hash (`select: false`)
is never projected. `?interest=` is trimmed and lowercased the way interests are stored, so
`?interest=Chess` finds `chess`. Pages are pages of *groups*.

```json
{
  "data": [{ "interest": "chess", "count": 5, "users": [{ "_id": "…", "name": "Maya Chen", "email": "maya@example.com" }] }],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### Scenario 2: `GET /users/:id/posts?page=&limit=` (any signed-in user)

**One pipeline that starts from `users`** and joins `posts` with `$lookup`. `$match` comes
first, so the lookup runs for exactly one user:

```text
$match   { _id: ObjectId(id) }                                    IDHACK: one user
$lookup  { from: "posts", localField: "_id", foreignField: "userId",  → posts { userId: 1 }
           let: { author: { _id, name, email? } },
           pipeline: [ $sort { userId: 1, _id: -1 },                  newest first (see Indexes)
                       $facet { data: [ $skip, $limit, $project { userId: 0 }, $addFields { author } ],
                                total: [ $count ] } ] }
$project { data: first(posts.data), total: first(posts.total.count) ?? 0 }
```

Posts are paginated *inside* the lookup, so the endpoint returns `{ data, meta }` like every
other list. Each post carries its `author`. `email` is included only when the caller is an
admin, decided by the service when it builds the pipeline. An unknown user is a `404
USER_NOT_FOUND`; a user with no posts is an empty page.

---

## Setup

**Requirements:**
- Node.js and Yarn 1. Developed and tested on Node 26 and Yarn 1.22.
- MongoDB 5.0 or later: `$lookup` with both `localField`/`foreignField` and a sub-pipeline needs
  5.0. Tested on MongoDB Atlas, 8.0.
- On Atlas, add your IP to the cluster's **Network Access** list. Otherwise the server fails at
  startup with a server-selection timeout.

```bash
yarn install
```

```bash
cp apps/server/.env.example apps/server/.env
```

Fill in `apps/server/.env`:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGODB_URI` | yes | | Full connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority`. |
| `MONGODB_DB_NAME` | yes | | Database inside the cluster, e.g. `secure_notes`. |
| `JWT_SECRET` | yes | | At least 32 characters. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | | `1h` | `<number><s\|m\|h\|d>` |
| `PORT` | | `3000` | |
| `CORS_ORIGIN` | | `http://localhost:4200` | Frontend origin(s), comma-separated. |
| `TRUST_PROXY` | | `false` | Number of proxies in front of the API (usually `1` on a host), so the rate limit sees real client IPs. |
| `AUTH_RATE_LIMIT` | | `5` | Register/login attempts per minute, per IP, per route. |
| `API_DOCS` | | `true` | Serve the API reference at `/api/docs`. |

The configuration is validated at startup. A missing or malformed value exits with a list of
what is wrong, without printing any values.

Seed the database. **This deletes all users, notes and posts in `MONGODB_DB_NAME`**, then makes
the indexes match the schemas exactly (`syncIndexes()`) and inserts 1 admin, 10 users, 30 notes
and 20 posts:

```bash
yarn seed
```

Start the API on <http://localhost:3000/api>:

```bash
yarn nx serve @org/server
```

Sign in with the [demo accounts](#demo-accounts): `admin@example.com` / `admin-demo-pass`, or
`maya@example.com` / `user-demo-pass`.

Regenerate the index evidence (writes `apps/server/docs/explain.md`, exits 1 if an index is
not used):

```bash
yarn explain
```

Interactive API reference (Scalar), with the OpenAPI document at
<http://localhost:3000/api/docs/openapi.json> (importable into Postman):

<http://localhost:3000/api/docs>

Checks:

```bash
yarn nx run-many -t build,typecheck,lint
```

---

## API

All routes are under `/api`. Send `Authorization: Bearer <accessToken>` everywhere except
`/auth/*`.

### Response shapes

Every response uses one of three envelopes:

```jsonc
{ "data": { … } }                                                           // a single result
{ "data": [ … ], "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }  // every list
{ "error": { "status": 404, "code": "NOTE_NOT_FOUND", "message": "Note not found.",
             "details": [ … ], "path": "/api/notes/…", "timestamp": "…", "requestId": "…" } }  // every error
```

- **Pagination** on every list: `?page=1&limit=10` by default. A `limit` above 100 is *capped*,
  not rejected: `?limit=500` returns at most 100 items, with `meta.limit: 100`. Zero, negatives and
  non-numbers are a `400`.
- **DELETE** returns `204` with no body.
- **`requestId`** is also sent as the `x-request-id` header; server errors are logged with it.
- **`details`** lists per-field problems on `VALIDATION_FAILED`, e.g.
  `{ "field": "interests.1", "message": "…" }`.

### Endpoints and access

| Route | user | admin | Notes |
|---|---|---|---|
| `POST /auth/register` | public | public | Always creates a `user`; a `role` field is a `400`. Rate-limited. |
| `POST /auth/login` | public | public | Same error and timing for unknown email and wrong password. Rate-limited. |
| `GET /notes` | own notes | all notes | Paginated, newest first. |
| `POST /notes` | ✓ | ✓ | The owner is always the caller; a `userId` field is a `400`. |
| `GET` / `PATCH` / `DELETE /notes/:id` | own only | any | Someone else's note is a **`404`**, exactly like a missing one, so ids can't be probed. |
| `GET /users/me`, `PATCH /users/me` | ✓ | ✓ | Name and interests only; `role`, `email` or `password` in the body is a `400`. |
| `GET /users/:id/posts` | ✓ (author name) | ✓ (name + email) | Scenario 2. |
| `GET /users/grouped-by-interests` | `403` | ✓ | Scenario 1 (it lists every user's email). |
| `GET /users`, `POST /users` | `403` | ✓ | `POST` can set `role` (default `user`). |
| `GET` / `PATCH` / `DELETE /users/:id` | `403` | ✓ | `PATCH` is the only place a role changes. `DELETE` also deletes the user's notes and posts. |

**Role escalation and lockout:**
- A user can't set any role: register and `PATCH /users/me` have no `role` field, and every
  `/users` admin route is `403`.
- An admin can't change their own role (`403 CANNOT_DEMOTE_SELF`) or delete their own account
  (`403 CANNOT_DELETE_SELF`), so there is always an admin left.
- The role is re-read from the database on every request, not trusted from the token. A
  promotion, demotion or deletion takes effect on the user's very next request.

### Error codes

Branch on `code`; `message` is safe to show to users.

| Status | Code | Message |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Some fields are invalid. (see `details`) |
| 400 | `INVALID_ID` | The id in the URL is not a valid id. |
| 400 | `MALFORMED_JSON` | The request body is not valid JSON. |
| 400 | `BAD_REQUEST` | The request could not be processed. |
| 401 | `UNAUTHENTICATED` | Sign in to continue. |
| 401 | `TOKEN_EXPIRED` | Your session has expired. Sign in again. |
| 401 | `INVALID_CREDENTIALS` | Email or password is incorrect. |
| 403 | `FORBIDDEN` | You do not have permission to do this. |
| 403 | `CANNOT_DEMOTE_SELF` | You cannot change your own role. |
| 403 | `CANNOT_DELETE_SELF` | You cannot delete your own account. |
| 404 | `NOTE_NOT_FOUND` | Note not found. |
| 404 | `USER_NOT_FOUND` | User not found. |
| 404 | `ROUTE_NOT_FOUND` | There is no endpoint at this path. |
| 409 | `EMAIL_TAKEN` | An account with this email already exists. |
| 409 | `CONFLICT` | This conflicts with existing data. |
| 413 | `PAYLOAD_TOO_LARGE` | The request body is too large. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Send the request body as application/json. |
| 429 | `RATE_LIMITED` | Too many attempts. Try again in a minute. |
| 500 | `INTERNAL_ERROR` | Something went wrong on our side. |
| 503 | `SERVICE_UNAVAILABLE` | The service is temporarily unavailable. Try again shortly. |

---

## Try it with curl

With the API running and the database seeded. These use `jq` to pull values out of responses.

```bash
API=http://localhost:3000/api
```

Sign in as the admin and as Maya:

```bash
ADMIN=$(curl -s $API/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"admin-demo-pass"}' | jq -r .data.accessToken)
```

```bash
MAYA=$(curl -s $API/auth/login -H 'Content-Type: application/json' -d '{"email":"maya@example.com","password":"user-demo-pass"}' | jq -r .data.accessToken)
```

Maya's notes, then create, edit and delete one:

```bash
curl -s "$API/notes?page=1&limit=3" -H "Authorization: Bearer $MAYA" | jq
```

```bash
NOTE=$(curl -s $API/notes -H "Authorization: Bearer $MAYA" -H 'Content-Type: application/json' -d '{"title":"From curl","content":"Hello"}' | jq -r .data._id)
```

```bash
curl -s -X PATCH $API/notes/$NOTE -H "Authorization: Bearer $MAYA" -H 'Content-Type: application/json' -d '{"title":"From curl, edited"}' | jq .data.title
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE $API/notes/$NOTE -H "Authorization: Bearer $MAYA"
```

Scenario 1 (admin), all groups and one interest:

```bash
curl -s "$API/users/grouped-by-interests" -H "Authorization: Bearer $ADMIN" | jq '.data[] | {interest, count}'
```

```bash
curl -s "$API/users/grouped-by-interests?interest=chess" -H "Authorization: Bearer $ADMIN" | jq
```

Scenario 2: Maya's posts as Maya (author name only), then as the admin (with email):

```bash
MAYA_ID=$(curl -s $API/users/me -H "Authorization: Bearer $MAYA" | jq -r .data._id)
```

```bash
curl -s "$API/users/$MAYA_ID/posts?limit=2" -H "Authorization: Bearer $MAYA" | jq
```

```bash
curl -s "$API/users/$MAYA_ID/posts?limit=2" -H "Authorization: Bearer $ADMIN" | jq '.data[0].author'
```

The access rules at work: a user on an admin route, a user trying to make themselves admin,
and the admin trying to demote themselves:

```bash
curl -s $API/users -H "Authorization: Bearer $MAYA" | jq .error.code
```

```bash
curl -s -X PATCH $API/users/me -H "Authorization: Bearer $MAYA" -H 'Content-Type: application/json' -d '{"role":"admin"}' | jq .error
```

```bash
ADMIN_ID=$(curl -s $API/users/me -H "Authorization: Bearer $ADMIN" | jq -r .data._id)
```

```bash
curl -s -X PATCH $API/users/$ADMIN_ID -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"role":"user"}' | jq .error.code
```

---

## Security

- **Passwords:**
  - bcrypt with 10 rounds, 8 to 72 bytes. Longer ones are refused rather than silently cut by
    bcrypt.
  - Login runs a comparison against a dummy hash when the email is unknown. Wrong password and
    unknown email take the same time and give the same `401 INVALID_CREDENTIALS`.
- **The hash never leaves the API.** It is protected three ways:
  - `select: false` keeps it out of every read except login.
  - A schema `toJSON`/`toObject` transform strips it from documents returned by `create()`.
  - Pipelines project users explicitly.
- **JWT:** HS256, pinned on both sign and verify; the secret is at least 32 characters. The
  payload is `{ sub, role }`, but the role is re-read from the database on every request (a
  primary-key lookup).
- **Guards:** `JwtAuthGuard` then `RolesGuard`, both global. `@Public()` opts the auth routes out.
  `@Roles(Admin)` sits on the users controller class, and the profile and posts routes reopen it
  per method.
- **Input:**
  - A global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`: unknown fields are
    a `400`, not silently dropped.
  - Ids are checked before any query.
  - Mongoose `sanitizeFilter` neutralises `$`-operators in filters.
  - `strictQuery: 'throw'` rejects filters on unknown fields.
  - JSON bodies are limited to 256 KB.
- **HTTP:**
  - `helmet` headers, and explicit CORS origins.
  - Login and register are rate-limited per IP; `TRUST_PROXY` makes that correct behind a proxy.
  - Every response has an `x-request-id`.
  - The docs page has its own CSP: a per-response script nonce, `connect-src 'self'`, a pinned
    Scalar bundle, and Scalar's telemetry and AI features off.
- **Errors:** messages come from one table. Stack traces, Mongo errors and request values are
  never sent to clients. 5xx errors are logged server-side with the request id.

---

## Project layout

```text
apps/server/src
├── main.ts, app.module.ts        AppModule: only ConfigModule, MongooseModule and feature modules
├── bootstrap/                    prefix, helmet, CORS, pipes, filter, interceptor, API docs
├── config/                       env validation, Config/Mongoose options
├── common/                       errors + mappers, response envelope, pagination, base repository, pipes
├── auth/                         register/login, JWT strategy, guards, decorators, bcrypt hasher
├── users/                        profile, admin CRUD, Scenario 1 + 2 (users.repository.ts)
├── notes/                        owner-scoped CRUD
├── posts/                        model only (no CRUD): seeded, read through Scenario 2
├── seed/                         yarn seed
└── explain/                      yarn explain → apps/server/docs/explain.md
```

Controllers handle HTTP only. Services hold the rules: ownership, lockout, what an admin may
see. Repositories hold every query, behind named methods on a shared `BaseRepository`, whose
generic operations are all `protected`. A service can't run an ad-hoc filter, so every query in
the system is listed in a repository file next to the index it uses.

---

## Frontend

`apps/note-client`: React 19, Vite, Tailwind v4 and react-router-dom 6, using raw `fetch`. Screens:
login, register, the paginated note list, the note editor, and the admin user list. The task
calls the frontend low priority, so it is kept small.

```bash
cp apps/note-client/.env.example apps/note-client/.env
```

```bash
yarn nx serve @org/note-client
```

It runs on <http://localhost:4200>. `VITE_API_URL` (required; `http://localhost:3000/api` in the
example file) points it at the API and is baked in at build time, so the two can be deployed to
different hosts. The token is kept in
`localStorage`. The app signs out only on `TOKEN_EXPIRED` or `UNAUTHENTICATED`.

---

## Known limits

- **Scenario 1 without `?interest=` is a `COLLSCAN`:** grouping every user reads every user.
  Each group's `users` array is built in one document. With millions of users per interest that
  would hit the 16 MB document limit; paginating users within a group would need a different
  pipeline.
- **The rate limit is in memory:** it resets on restart and counts per instance, so N instances
  allow N × the limit. A shared store, such as Redis, would fix both.
- **Indexes are built at startup** (Mongoose `autoIndex`). Dropping a collection while the API
  runs removes its indexes until the next start. The seed calls `syncIndexes()` for this reason.
  A production deployment would build indexes in a migration step and turn `autoIndex` off.
- **No transactions for the cascade delete:** it deletes notes, then posts, then the user. If
  it stops halfway, the user still exists and repeating the request finishes the job. The
  reverse order could leave orphans that nothing would clean up.
- **`_id` ordering is per second** (see [above](#why-sort-on-_id-not-createdat)).
- **Tokens can't be revoked individually** before they expire. Deleting or demoting the user
  takes effect immediately, because the role and existence are checked on every request.
