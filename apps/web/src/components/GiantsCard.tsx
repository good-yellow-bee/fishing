import { fishById, SPOT_LABELS } from "@stillwater/shared";
import { getGiants } from "../api";
import { t, useT } from "../i18n";
import { weightText } from "../i18n/content";
import { useBoardRead } from "./rankedBoard";

/** The week's giants on the lodge board: one named fish a bank, and who landed it first. */
export function GiantsCard() {
  useT();
  const { board, error } = useBoardRead(getGiants);
  if (error) return <p className="warn" role="alert">{error}</p>;
  if (!board) return null;
  return (
    <section className="derby-card" aria-labelledby="giants-title">
      <p>
        <strong id="giants-title">{t("The lake's giants this week")}</strong>
        <br />
        <small>{t("One named fish a bank, till Monday 00:00 UTC. The first angler to land one takes it from the lake.")}</small>
      </p>
      <ul className="derby-entries giants">
        {board.map((giant) => {
          const fish = fishById(giant.speciesId);
          const line = t("{bank}: {name}, a {weight} {fish}", { bank: t(SPOT_LABELS[giant.spot]), name: t(giant.name), weight: weightText(giant.weight), fish: fish ? t(fish.name).toLowerCase() : giant.speciesId });
          return (
            <li key={giant.spot} data-you="0">
              {giant.landedBy && giant.letGoBy
                ? t("{giant} · let go by {first}, landed again by {name}", { giant: line, first: giant.letGoBy, name: giant.landedBy })
                : giant.landedBy
                  ? t("{giant} · landed by {name}", { giant: line, name: giant.landedBy })
                  : giant.letGoBy
                    ? t("{giant} · let go by {name}, out again for {points} pts", { giant: line, name: giant.letGoBy, points: giant.bonus })
                    : t("{giant} · still out there", { giant: line })}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
