import { fishById } from "@stillwater/shared";
import { getDerby } from "../api";
import { t, useT } from "../i18n";
import { weightText } from "../i18n/content";
import { FishMark } from "./FishMark";
import { RankedList, useBoardRead } from "./rankedBoard";

/** The weekend derby on the lodge board: this weekend's fish and its heaviest, or the next one on a weekday. */
export function DerbyCard() {
  useT();
  const { board, error } = useBoardRead(getDerby);

  if (error) return <p className="warn" role="alert">{error}</p>;
  const fish = board ? fishById(board.derby.fishId) : undefined;
  if (!board || !fish) return null;
  const champion = board.lastChampion ? fishById(board.lastChampion.fishId) : undefined;
  return (
    <section className="derby-card" aria-labelledby="derby-title">
      <p className="weekly-fish">
        <FishMark species={fish} />
        <span>
          <strong id="derby-title">{board.running ? t("Weekend derby: the heaviest {fish}", { fish: t(fish.name).toLowerCase() }) : t("Next weekend derby: the heaviest {fish}", { fish: t(fish.name).toLowerCase() })}</strong>
          <small>{board.running ? t("Runs till Monday 00:00 UTC, one race for the whole lodge.") : t("Starts Saturday 00:00 UTC, one race for the whole lodge.")}</small>
        </span>
      </p>
      {board.running && board.entries.length > 0 && (
        <RankedList entries={board.entries} youRank={board.you?.rank ?? null} row={(row) => t("{rank}. {name} · {weight}", { rank: row.rank, name: row.displayName, weight: weightText(row.weight) })} />
      )}
      {board.running && board.entries.length === 0 && <p>{t("No one has landed one yet this weekend.")}</p>}
      {board.running && board.you && board.you.rank > 10 && <p>{t("You: #{rank}, {weight}", { rank: board.you.rank, weight: weightText(board.you.weight) })}</p>}
      {board.lastChampion && champion && (
        <p className="derby-champion">
          {t("Last weekend's champion: {name}, with a {weight} {fish}", { name: board.lastChampion.displayName, weight: weightText(board.lastChampion.weight), fish: t(champion.name).toLowerCase() })}
        </p>
      )}
    </section>
  );
}
