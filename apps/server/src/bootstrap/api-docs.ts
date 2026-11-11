import { randomBytes } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import helmet from 'helmet';
import { ErrorCode, ERRORS } from '../common/errors/error-code';

/** Pinned: the script can see the reader's token, and one file fits a nonce CSP. */
const SCALAR_BUNDLE = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0';

const DESCRIPTION = `
Secure note-taking API. Every response uses one of three envelopes:

- \`{ "data": ... }\` for a single result
- \`{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }\` for every list
  (\`?page=1&limit=10\` by default; \`limit\` is capped at 100)
- \`{ "error": { "status", "code", "message", "details?", "path", "timestamp", "requestId" } }\` for every error

Authenticate with \`POST /api/auth/login\` and send the token as \`Authorization: Bearer <token>\`.

### Error codes

| Status | Code | Message |
|---|---|---|
${Object.values(ErrorCode)
  .map((code) => `| ${ERRORS[code].status} | \`${code}\` | ${ERRORS[code].message} |`)
  .join('\n')}
`;

/**
 * Serves `<prefix>/docs` (Scalar) and `<prefix>/docs/openapi.json`. Call before helmet();
 * the page sets its own nonce-based CSP.
 */
export function setupApiDocs(app: NestExpressApplication, prefix: string): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Secure Notes API')
      .setVersion('1.0.0')
      .setDescription(DESCRIPTION)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .addTag('auth', 'Register and log in. Public, rate-limited per client IP.')
      .addTag('notes', 'Private notes. Users see their own; admins see all.')
      .addTag('users', 'Profiles, admin user management and the two aggregation scenarios.')
      .build(),
  );

  const docsPath = `/${prefix}/docs`;
  const specPath = `${docsPath}/openapi.json`;
  const http = app.getHttpAdapter().getInstance();

  const docsHeaders = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: [(_req, res) => `'nonce-${(res as Response).locals['cspNonce']}'`],
        // Scalar renders inline style attributes, which a nonce can't cover.
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:', 'https://fonts.scalar.com'],
        imgSrc: ["'self'", 'data:'],
        // "Try it" requests go to this API only.
        connectSrc: ["'self'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });

  http.get(specPath, helmet(), (_req: Request, res: Response) => {
    res.json(document);
  });

  http.get(
    docsPath,
    (_req: Request, res: Response, next: NextFunction) => {
      res.locals['cspNonce'] = randomBytes(16).toString('base64');
      next();
    },
    docsHeaders,
    (req: Request, res: Response) => {
      const render = apiReference({
        url: specPath,
        pageTitle: 'Secure Notes API',
        cdn: SCALAR_BUNDLE,
        nonce: res.locals['cspNonce'] as string,
        authentication: { preferredSecurityScheme: 'bearer' },
        // No toolbar, AI chat, MCP or telemetry: nothing goes to Scalar's servers.
        showDeveloperTools: 'never',
        agent: { disabled: true },
        mcp: { disabled: true },
        telemetry: false,
      }) as RequestHandler;
      render(req, res, () => undefined);
    },
  );
}
