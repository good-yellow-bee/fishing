import { Link } from "react-router-dom";
import { localDate, measureOf, type CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { measureText } from "../i18n/content";
import { biggestOf } from "./BiggestHere";
import { formatDay } from "./format";

type SizeHere = { largest: CatchEntry; record: CatchEntry; kind: "length" | "weight" };

/**
 * An outing's largest fish against the largest its water has given, by length where the day measured one, else by
 * weight. Null without a measured fish, or while the day's fish are all the water has.
 */
export function recordHere(day: readonly CatchEntry[], water: readonly CatchEntry[]): SizeHere | null {
  if (water.length <= day.length) return null;
  const mine = biggestOf(day);
  const all = biggestOf(water);
  if (mine.longest && all.longest) return { largest: mine.longest, record: all.longest, kind: "length" };
  if (mine.heaviest && all.heaviest) return { largest: mine.heaviest, record: all.heaviest, kind: "weight" };
  return null;
}

/** "Largest today: 28 in · This water's record: 34 in, Jun 12", each size opening its fish. */
export function RecordHere({ largest, record, kind, recordDay }: SizeHere & { recordDay?: string }) {
  const size = (entry: CatchEntry) => measureText(measureOf(entry, kind)!);
  const amount = (entry: CatchEntry) => {
    const measure = measureOf(entry, kind);
    return measure?.kind === "length" ? measure.inches : measure?.kind === "weight" ? measure.pounds : 0;
  };
  return (
    <p className="meta record-here">
      {t("Largest this outing:")} <Link to={`/catches/${largest.id}`}>{size(largest)}</Link>
      {/* A fish as large as the record shares it: the line doesn't point at another one as the record. */}
      {record.id === largest.id || amount(largest) >= amount(record) ? (
        <> {t("(this water's record)")}</>
      ) : (
        <>
          {" · "}
          {t("This water's record:")} <Link to={`/catches/${record.id}`}>{size(record)}</Link>, {formatDay(recordDay ?? localDate(new Date(record.caughtAt)))}
        </>
      )}
    </p>
  );
}
