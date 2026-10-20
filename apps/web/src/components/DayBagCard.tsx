import { BAG_SIZE } from "@stillwater/shared";
import { getDayBag } from "../api";
import { t, useT } from "../i18n";
import { weightText } from "../i18n/content";
import { RankedList, useBoardRead } from "./rankedBoard";

/** The day's bag on the lodge board: today's heaviest five-fish bags (UTC), and where the angler stands. */
export function DayBagCard() {
  useT();
  const { board, error } = useBoardRead(getDayBag);

  if (error) return <p className="warn" role="alert">{error}</p>;
  if (!board) return null;
  return (
    <section className="derby-card" aria-labelledby="bag-title">
      <p>
        <strong id="bag-title">{t("Day's bag: each angler's {n} heaviest fish today", { n: BAG_SIZE })}</strong>
        <br />
        <small>{t("Their total weight, till 00:00 UTC, one race for the whole lodge.")}</small>
      </p>
      {board.entries.length > 0 ? (
        <RankedList entries={board.entries} youRank={board.you?.rank ?? null} row={(row) => t("{rank}. {name} · {weight} in {n} fish", { rank: row.rank, name: row.displayName, weight: weightText(row.total), n: row.count })} />
      ) : (
        <p>{t("No one has landed a fish yet today.")}</p>
      )}
      {board.you && board.you.rank > 10 && <p>{t("You: #{rank}, {weight}", { rank: board.you.rank, weight: weightText(board.you.total) })}</p>}
    </section>
  );
}
