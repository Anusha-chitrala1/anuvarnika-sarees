import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Creates an in-memory Cloudflare D1Database compliant mock using better-sqlite3
 * and runs all migrations + seed SQL
 */
export function createTestD1(): any {
  const db = new Database(':memory:');

  // Load all SQL migrations in order + UAT seed
  const migrationsDir = path.resolve(import.meta.dirname, '../../../packages/db/migrations');
  const seedsDir = path.resolve(import.meta.dirname, '../../../packages/db/seeds');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of migrationFiles) {
    db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
  }
  const seedUat = fs.readFileSync(path.join(seedsDir, 'seed-uat.sql'), 'utf-8');
  db.exec(seedUat);

  // Return a mock D1Database interface
  return {
    rawDb: db,
    prepare(query: string) {
      let boundParams: any[] = [];
      return {
        bind(...params: any[]) {
          boundParams = params;
          return this;
        },
        async all() {
          const stmt = db.prepare(query);
          const results = stmt.all(...boundParams);
          return { results, success: true, meta: { changes: 0 } };
        },
        async run() {
          const stmt = db.prepare(query);
          const info = stmt.run(...boundParams);
          return {
            results: [],
            success: true,
            meta: {
              changes: info.changes,
              last_row_id: Number(info.lastInsertRowid),
            },
          };
        },
        async first(colName?: string) {
          const stmt = db.prepare(query);
          const row: any = stmt.get(...boundParams);
          if (!row) return null;
          return colName ? row[colName] : row;
        },
        async raw() {
          const stmt = db.prepare(query);
          return stmt.raw().all(...boundParams);
        },
      };
    },
    async batch(statements: any[]) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
    async exec(query: string) {
      db.exec(query);
      return { count: 1, duration: 0 };
    },
  };
}
