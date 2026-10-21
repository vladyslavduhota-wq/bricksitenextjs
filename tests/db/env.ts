/** The test database is dropped on every run, so refuse anything not clearly named as a test DB. */
export function testDatabaseUrl() {
  const raw = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/brik_auction_test";
  const name = new URL(raw).pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`TEST_DATABASE_URL must point at a database ending in _test, got "${name}"`);
  return raw;
}
