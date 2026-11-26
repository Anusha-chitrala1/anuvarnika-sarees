import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@anuvarnika/db';
import { Env } from './types.js';

let dbInstance: DrizzleD1Database<typeof schema> | null = null;

export function getDb(env: Env): DrizzleD1Database<typeof schema> {
  return drizzle(env.DB, { schema });
}
