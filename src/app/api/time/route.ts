// Server clock for countdowns: visitors' clocks can be off, the database closes lots on server time.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
