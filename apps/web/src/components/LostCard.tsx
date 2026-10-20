import { fishById, LOST_DAYS, LOST_FINDER_BONUS, SPOT_LABELS } from "@stillwater/shared";
import { getLodgeLost } from "../api";
import { t, useT } from "../i18n";
import { weightText } from "../i18n/content";
import { useBoardRead } from "./rankedBoard";

const readLost = () => getLodgeLost().then((body) => body.lost);

/** Other anglers' lost trophies still about the lake, by bank, for anyone deciding where to try. */
export function LostCard() {
  useT();
  const { board, error } = useBoardRead(readLost);
  if (error) return <p className="warn" role="alert">{error}</p>;
  if (!board) return null;
  return (
    <section className="derby-card" aria-labelledby="lost-title">
      <p>
        <strong id="lost-title">{t("Lost trophies about the lake")}</strong>
        <br />
        <small>{t("Trophies that broke an angler's line in the last {days} days. The first to land one is paid {points} pts.", { days: LOST_DAYS, points: LOST_FINDER_BONUS })}</small>
      </p>
      {board.length === 0 ? (
        <p>
          <small>{t("None about just now.")}</small>
        </p>
      ) : (
        <ul className="derby-entries">
          {board.map((lost) => {
            const fish = fishById(lost.speciesId);
            return (
              <li key={lost.id} data-you="0">
                {t("{bank}: a {weight} {fish}, lost by {name}", { bank: t(SPOT_LABELS[lost.spot]), weight: weightText(lost.weight), fish: fish ? t(fish.name).toLowerCase() : lost.speciesId, name: lost.by })}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
