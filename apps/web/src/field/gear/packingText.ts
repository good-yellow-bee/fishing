import type { TackleItem } from "@stillwater/shared";
import { t } from "../../i18n";

/** An outing's tackle as a checklist for a message: a box per piece, ticked when packed. */
export function packingText(title: string, rows: readonly TackleItem[]): string {
  const lines = rows.map((item) => `${item.packed ? "[x]" : "[ ]"} ${t(item.label)}`);
  return [title, ...lines].join("\n");
}
