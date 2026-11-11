import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

/**
 * Environment rules, checked at boot. Messages never include values, so secrets stay out
 * of logs.
 */
export class Env {
  @Matches(/^mongodb(\+srv)?:\/\/\S+$/, {
    message: 'MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string',
  })
  MONGODB_URI!: string;

  @Matches(/^[^/\\. "$]+$/, { message: 'MONGODB_DB_NAME must not contain / \\ . " $ or spaces' })
  @IsNotEmpty({ message: 'MONGODB_DB_NAME must be set' })
  MONGODB_DB_NAME!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @Matches(/^\d+[smhd]$/, { message: 'JWT_EXPIRES_IN must look like 15m, 1h or 7d' })
  JWT_EXPIRES_IN = '1h';

  // Env values are strings; convert explicitly.
  @Max(65535)
  @Min(1)
  @IsInt({ message: 'PORT must be a whole number' })
  @Type(() => Number)
  PORT = 3000;

  /** Comma-separated frontend origins. */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN = 'http://localhost:4200';

  /**
   * Express "trust proxy": the number of proxies in front of the app, or their addresses, so
   * the rate limit sees client IPs. Not "true", which would let clients spoof their IP.
   */
  @Matches(/^(false|true|\d+|[0-9A-Za-z.:/,\s]+)$/, {
    message: 'TRUST_PROXY must be false, a number of proxy hops, or a comma-separated list of addresses',
  })
  TRUST_PROXY = 'false';

  /** Register/login attempts per minute, per IP. */
  @Max(1000)
  @Min(1)
  @IsInt({ message: 'AUTH_RATE_LIMIT must be a whole number' })
  @Type(() => Number)
  AUTH_RATE_LIMIT = 5;

  /** Serve the API reference at /api/docs. */
  @Matches(/^(true|false)$/, { message: 'API_DOCS must be true or false' })
  API_DOCS = 'true';
}

const SECONDS = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

/** "15m" -> 900. */
export function durationToSeconds(value: string): number {
  const unit = value.slice(-1) as keyof typeof SECONDS;
  return Number(value.slice(0, -1)) * SECONDS[unit];
}

/** The value for Express's "trust proxy" setting. */
export function trustProxySetting(value: string): boolean | number | string {
  if (value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false, stopAtFirstError: true });
  if (errors.length > 0) {
    const problems = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new Error(
      [
        'Invalid environment configuration:',
        ...problems.map((p) => `  - ${p}`),
        'Set these in apps/server/.env (see .env.example) or in the host environment.',
      ].join('\n'),
    );
  }
  return env;
}
