import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { DomainErrorMapper } from '../common/filters/mappers/domain-error.mapper';
import { HttpErrorMapper } from '../common/filters/mappers/http-error.mapper';
import { MongoErrorMapper } from '../common/filters/mappers/mongo-error.mapper';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { bodyParserErrorMiddleware } from '../common/middleware/body-parser-errors.middleware';
import { REQUEST_ID_HEADER, requestIdMiddleware } from '../common/middleware/request-id.middleware';
import { validationExceptionFactory } from '../common/validation/validation-exception.factory';
import { Env, trustProxySetting } from '../config/env.validation';
import { setupApiDocs } from './api-docs';

export const API_PREFIX = 'api';

// Fits a 50,000-character note in UTF-8; Express's 100 KB default would not.
const JSON_BODY_LIMIT = '256kb';

/** App-wide setup outside the module tree, shared by main.ts and tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);

  // Sets req.ip, which the rate limit counts by.
  app.set('trust proxy', trustProxySetting(config.get('TRUST_PROXY', { infer: true })));

  // First, so every response has an id.
  app.use(requestIdMiddleware);
  // Before helmet(): the docs page sets its own CSP.
  if (config.get('API_DOCS', { infer: true }) === 'true') setupApiDocs(app, API_PREFIX);
  app.use(helmet());

  const origins = config
    .get('CORS_ORIGIN', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, exposedHeaders: [REQUEST_ID_HEADER] });

  // The error middleware must follow the parser directly to see its errors.
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(bodyParserErrorMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // unknown fields (e.g. `role`) are a 400
      transform: true,
      transformOptions: { exposeDefaultValues: true },
      stopAtFirstError: true,
      validationError: { target: false, value: false }, // keep input values out of errors
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Domain errors first, then framework, then database.
  app.useGlobalFilters(
    new AllExceptionsFilter([new DomainErrorMapper(), new HttpErrorMapper(), new MongoErrorMapper()]),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();
}
