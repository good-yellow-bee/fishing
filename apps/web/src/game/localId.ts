/**
 * IDs only identify local catch cards and field-log entries. A secure context
 * provides UUIDs, while the fallback keeps gameplay working on local HTTP.
 */
export function localId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
  return `local-${Date.now().toString(36)}-${random}`;
}
