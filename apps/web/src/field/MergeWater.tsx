import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { t, useT } from "../i18n";
import { useLogbook } from "./LogbookState";
import { mergeWaters, noteMergedWater } from "./waterMerge";

/** The game's own lake: its fish come from play, so it neither merges into a real water nor takes one in. */
const PLAY_LAKE_ID = "spot-stillwater";

/** A water logged twice under two names, folded into the other one with its outings and fish. */
export function MergeWater({ spotId }: { spotId: string }) {
  // The book as stored: the shown one has the sample week in the player's language, which must not be saved.
  const { storedBook, book, changeBook } = useLogbook();
  useT();
  const navigate = useNavigate();
  const others = book.spots.filter((spot) => spot.id !== spotId && spot.id !== PLAY_LAKE_ID).sort((a, b) => a.name.localeCompare(b.name));
  const [into, setInto] = useState("");
  if (others.length === 0 || spotId === PLAY_LAKE_ID) return null;
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!into) return;
    const next = mergeWaters(storedBook, spotId, into);
    if (next === storedBook) return;
    if (!changeBook("merge", next)) return;
    noteMergedWater(spotId, into);
    navigate(`/spots/${into}`, { replace: true });
  };
  return (
    <details className="rename-kind">
      <summary>{t("Merge into another water")}</summary>
      <form onSubmit={onSubmit} className="rename-kind-form">
        <label>
          {t("Move its outings and fish to")}
          <select value={into} onChange={(event) => setInto(event.target.value)} required aria-describedby="merge-water-hint">
            <option value="">{t("Choose a water")}</option>
            {others.map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </select>
        </label>
        <p className="field-hint" id="merge-water-hint">
          {t("This water then leaves the book; its notes and place fill in only what the other one lacks.")}
        </p>
        <button type="submit" className="field-primary inline">
          {t("Merge")}
        </button>
      </form>
    </details>
  );
}
