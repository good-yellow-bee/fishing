import { localDate } from "@stillwater/shared";

/** "stillwater-field-log.json" → "stillwater-field-log-2026-10-16.json": a copy saved each day keeps its own name in Downloads. */
export function datedName(name: string, day = localDate(new Date())): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? `${name}-${day}` : `${name.slice(0, dot)}-${day}${name.slice(dot)}`;
}

/** Hands the browser a file made on the device; nothing is uploaded. */
export function downloadFile(text: string, type: string, name: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers read the file after click() returns, so let it go a little later.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
