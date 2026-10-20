import { getStewards } from "../api";
import { t, useT } from "../i18n";
import { RankedList, useBoardRead } from "./rankedBoard";

/** This week's stewards on the lodge board: the anglers who let the most fish go since Monday (UTC). */
export function StewardsCard() {
  useT();
  const { board, error } = useBoardRead(getStewards);

  if (error) return <p className="warn" role="alert">{error}</p>;
  if (!board) return null;
  return (
    <section className="derby-card" aria-labelledby="stewards-title">
      <p>
        <strong id="stewards-title">{t("Stewards of the week: the most fish let go")}</strong>
        <br />
        <small>{t("Since Monday 00:00 UTC. Fish let go keep their banks stocked.")}</small>
      </p>
      {board.entries.length > 0 ? (
        <RankedList entries={board.entries} youRank={board.you?.rank ?? null} row={(row) => t("{rank}. {name} · {count} let go", { rank: row.rank, name: row.displayName, count: row.count })} />
      ) : (
        <p>{t("No one has let a fish go yet this week.")}</p>
      )}
      {board.you && board.you.rank > 10 && <p>{t("You: #{rank}, {count} let go", { rank: board.you.rank, count: board.you.count })}</p>}
    </section>
  );
}
