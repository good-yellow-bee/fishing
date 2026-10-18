import type { Logbook, Spot } from "@stillwater/shared";
import { locale, t } from "../i18n";
import { isSampleSpot, ownWatersFirst } from "./bookCopy";
import { countedFish } from "./milestones";
import { PLAY_LAKE_ID } from "./playLake";
import { spotsByLastFish } from "./spotOrder";

/** Past this many of the angler's own waters, a picker opens with the ones fished lately. */
const LATELY_FROM = 6;
const LATELY = 3;

/**
 * A water picker's options: the angler's own first, then the sample week's, then the game's lake. With a long list,
 * the three fished most lately come first in their own group and the rest follow by name, so last weekend's water
 * isn't a long scroll down.
 */
export function WaterOptions({ book, spots }: { book: Logbook; spots: readonly Spot[] }) {
  const ordered = ownWatersFirst(spots);
  const own = ordered.filter((spot) => spot.id !== PLAY_LAKE_ID && !isSampleSpot(spot.id));
  const lately =
    own.length > LATELY_FROM
      ? spotsByLastFish({ ...book, catches: countedFish(book.catches) })
          .filter((row) => row.lastFishDay && own.some((spot) => spot.id === row.spot.id))
          .slice(0, LATELY)
          .map((row) => row.spot)
      : [];
  const option = (spot: Spot) => (
    <option key={spot.id} value={spot.id}>
      {spot.name}
    </option>
  );
  if (lately.length === 0) return <>{ordered.map(option)}</>;
  const picked = new Set(lately.map((spot) => spot.id));
  const byName = (a: Spot, b: Spot) => a.name.localeCompare(b.name, locale());
  const rest = [...own.filter((spot) => !picked.has(spot.id)).sort(byName), ...ordered.filter((spot) => !own.includes(spot))];
  return (
    <>
      <optgroup label={t("Fished lately")}>{lately.map(option)}</optgroup>
      <optgroup label={t("All waters")}>{rest.map(option)}</optgroup>
    </>
  );
}
