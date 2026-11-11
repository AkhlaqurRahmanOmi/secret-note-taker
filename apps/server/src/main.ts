import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './bootstrap/configure-app';
import { Env } from './config/env.validation';

async function bootstrap() {
  // Reject instead of process.abort() on init failure, so we exit with a normal code.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { abortOnError: false }).catch(() => process.exit(1));
  configureApp(app);

  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port);

  // Set when Nx waits for this server to be ready
  if (process.env.NX_READY_SIGNAL_SOCKET) {
    try {
      // Keeps the bundler from resolving this import
      const load = new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<{ emitReadySignal(server: unknown): boolean }>;
      (await load('@nx/js/ready-signal')).emitReadySignal(app.getHttpServer());
    } catch {
      // @nx/js isn't installed
    }
  }
  Logger.log(`API listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

// Errors Nest doesn't report itself, e.g. the port is in use.
bootstrap().catch((err: unknown) => {
  Logger.error(err instanceof Error ? err.message : String(err), 'Bootstrap');
  process.exit(1);
});
