type Connection = { saveData?: boolean; effectiveType?: string };
type IdleHost = {
  requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number;
  setTimeout: (run: () => void, ms: number) => unknown;
};

/** A data saver or a slow link keeps the 3D bundle for when the player actually opens the lake. */
export function lakeWorthWarming(connection: Connection | undefined) {
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}

/**
 * Once the field log has drawn and the browser is idle, fetch the lake's code
 * so "Go fishing" opens without the wait. Runs at most once per visit.
 */
let warmed = false;
export function warmLake(
  load: () => Promise<unknown>,
  host: IdleHost = window,
  connection: Connection | undefined = (navigator as Navigator & { connection?: Connection }).connection,
) {
  if (warmed || !lakeWorthWarming(connection)) return false;
  warmed = true;
  const run = () => void load().catch(() => undefined);
  if (host.requestIdleCallback) host.requestIdleCallback(run, { timeout: 8000 });
  else host.setTimeout(run, 3000);
  return true;
}

/** For tests: let the next visit warm again. */
export function forgetWarmed() {
  warmed = false;
}
