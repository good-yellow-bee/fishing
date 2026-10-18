import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { t, tn, useT } from "../i18n";
import { useLogbook } from "./LogbookState";
import { mergeMoves, mergeWaters, noteMergedWater } from "./waterMerge";
import { PLAY_LAKE_ID } from "./playLake";

/** In a water's link, the water to merge it into: the merge box opens with it picked. */
export const MERGE_PARAM = "merge";

/** A water logged twice under two names, folded into the other one with its outings and fish. */
export function MergeWater({ spotId }: { spotId: string }) {
  // The book as stored: the shown one has the sample week in the player's language, which must not be saved.
  const { storedBook, book, changeBook } = useLogbook();
  useT();
  const navigate = useNavigate();
  const others = book.spots.filter((spot) => spot.id !== spotId && spot.id !== PLAY_LAKE_ID).sort((a, b) => a.name.localeCompare(b.name));
  const [params] = useSearchParams();
  const asked = params.get(MERGE_PARAM);
  const [into, setInto] = useState(() => (asked && others.some((spot) => spot.id === asked) ? asked : ""));
  const box = useRef<HTMLDetailsElement>(null);
  const select = useRef<HTMLSelectElement>(null);
  // Sent here to merge (from a book file that added this water twice): the box comes into view, open, with focus on it.
  useEffect(() => {
    if (!asked || !box.current) return;
    box.current.open = true;
    box.current.scrollIntoView({ block: "center" });
    setTimeout(() => select.current?.focus(), 0);
  }, [asked]);
  if (others.length === 0 || spotId === PLAY_LAKE_ID) return null;
  const moves = into ? mergeMoves(storedBook, spotId, into) : null;
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
    <details ref={box} className="rename-kind">
      <summary>{t("Merge into another water")}</summary>
      <form onSubmit={onSubmit} className="rename-kind-form">
        <label>
          {t("Move its outings and fish to")}
          <select ref={select} value={into} onChange={(event) => setInto(event.target.value)} required aria-describedby="merge-water-hint">
            <option value="">{t("Choose a water")}</option>
            {others.map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </select>
        </label>
        {/* Counted before the tap, so a wrong pick shows itself. */}
        <p className="field-hint" role="status">
          {moves
            ? moves.outings + moves.fish === 0
              ? t("No outings or fish to move.")
              : (moves.outings > 0 && moves.fish > 0
                  ? t("Moves {outings} and {fish}.", { outings: tn(moves.outings, "{n} outing", "{n} outings"), fish: tn(moves.fish, "{n} fish", "{n} fish") })
                  : t("Moves {what}.", { what: moves.outings > 0 ? tn(moves.outings, "{n} outing", "{n} outings") : tn(moves.fish, "{n} fish", "{n} fish") })) + (moves.joined > 0 ? ` ${tn(moves.joined, "{n} outing joins the one on its day.", "{n} outings join the ones on their days.")}` : "")
            : null}
        </p>
        <p className="field-hint" id="merge-water-hint">
          {t("This water then leaves the book; its notes and place fill in only what the other one lacks, and an outing on a day the other water has one joins it.")}
        </p>
        <button type="submit" className="field-primary inline">
          {t("Merge")}
        </button>
      </form>
    </details>
  );
}
