import type { ConfigModuleOptions } from '@nestjs/config';
import { validateEnv } from './env.validation';

/** Shared by AppModule and the explain script. */
export const CONFIG_OPTIONS: ConfigModuleOptions = {
  isGlobal: true,
  cache: true,
  // Works from apps/server or the workspace root; real env vars win.
  envFilePath: ['.env', 'apps/server/.env'],
  validate: validateEnv,
};
