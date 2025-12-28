import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { appendToLogFile } from '@/lib/debug-logger';
import { Logger } from 'drizzle-orm/logger';

class FileLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    appendToLogFile('db', query, params);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development' ? new FileLogger() : undefined,
});
