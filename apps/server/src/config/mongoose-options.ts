import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { MongooseModuleFactoryOptions } from '@nestjs/mongoose';
import type { Env } from './env.validation';

/** Shared by AppModule and the explain script. */
export function mongooseOptions(config: ConfigService<Env, true>): MongooseModuleFactoryOptions {
  const logger = new Logger('MongoDB');
  return {
    uri: config.get('MONGODB_URI', { infer: true }),
    dbName: config.get('MONGODB_DB_NAME', { infer: true }),
    // `$` operators inside filter values are matched literally (operator injection).
    sanitizeFilter: true,
    serverSelectionTimeoutMS: 10_000,
    retryAttempts: 3,
    retryDelay: 2_000,
    onConnectionCreate: (connection) => {
      // Host and database name only: the URI carries credentials.
      connection.on('connected', () => logger.log(`Connected to ${connection.host}/${connection.name}`));
      connection.on('disconnected', () => logger.warn('Disconnected'));
    },
  };
}
