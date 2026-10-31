import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { testDatabaseUrl } from "./env";

const MIGRATIONS = join(import.meta.dirname, "../../supabase/migrations");
// Need Supabase-only schemas (pg_cron, storage).
const SKIP = new Set(["20261022000200_schedules.sql", "20261023000200_storage.sql", "20261031000100_stop_timers.sql"]);

/** Recreates the test database and applies the Supabase shim plus every migration. */
export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const name = url.pathname.slice(1);

  const admin = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: "/postgres" }).toString() });
  await admin.connect();
  await admin.query(`drop database if exists "${name}" with (force)`);
  await admin.query(`create database "${name}"`);
  await admin.end();

  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(readFileSync(join(import.meta.dirname, "supabase-shim.sql"), "utf8"));
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    if (SKIP.has(file)) continue;
    try {
      await db.query(readFileSync(join(MIGRATIONS, file), "utf8"));
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
  await db.end();
}
