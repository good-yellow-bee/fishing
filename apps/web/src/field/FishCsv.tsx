import type { CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { catchesCsv } from "./catchCsv";
import { downloadFile } from "./download";
import { useLogbook } from "./LogbookState";

/** "Cedar Bend" → "stillwater-cedar-bend.csv". */
export function csvName(name: string): string {
  const slug = name.toLowerCase().replace(/ł/g, "l").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `stillwater-${slug || "catches"}.csv`;
}

/** The spreadsheet of just these fish (an outing's, a water's or a kind's), named after them. */
export function FishCsv({ catches, name }: { catches: readonly CatchEntry[]; name: string }) {
  const { book } = useLogbook();
  useT();
  if (catches.length === 0) return null;
  return (
    <p className="fish-csv">
      <button type="button" className="text-button" onClick={() => downloadFile(catchesCsv({ ...book, catches: [...catches] }), "text/csv;charset=utf-8", csvName(name))}>
        {t("Download these as a spreadsheet")}
      </button>
    </p>
  );
}
