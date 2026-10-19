// Runs once per server instance (Node.js runtime): applies pending migrations,
// seeds reference data when the database is empty and warms the odds cache.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { bootstrap } = await import("./lib/bootstrap");
    await bootstrap();
  } catch (err) {
    console.error("[bootstrap] failed", err instanceof Error ? err.message : err);
  }
}
