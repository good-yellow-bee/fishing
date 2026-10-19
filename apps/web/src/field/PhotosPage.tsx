import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { catchesNewestFirst, localDate, spotById, type CatchEntry } from "@stillwater/shared";
import { photoRoomChars } from "./photoStore";
import { spareGameSnapshots } from "./keepCatch";
import { t, tn, useT } from "../i18n";
import { measuresText } from "../i18n/content";
import { formatClock, formatDay } from "./format";
import { useLogbook } from "./LogbookState";
import { catchPage, useShowMore } from "./PagedCatches";
import { bookFishDay, monthName } from "./tripMonths";
import { speciesCounts } from "./speciesLink";
import { FROM_LIST } from "./leaveDeleted";
import { catchLink } from "./catchList";
import { FIND_PARAM, exactTerm } from "./findLinks";
import { biggestOf } from "./BiggestHere";
import { MatchOrder, useLargestOrder } from "./MatchOrder";
import { largestFirst } from "./largestFirst";
import { countedFish, ownFish } from "./milestones";
import { hasSampleFish, isSampleCatch } from "./bookCopy";

/** The photos' stored length, as JSON.stringify would give it, without building a copy of every picture to count it. */
export function storedSize(photos: Record<string, string>): number {
  const entries = Object.entries(photos);
  // Ids and data URLs need no escaping: each is `"id":"photo"`, with a comma between and braces round.
  return 2 + Math.max(0, entries.length - 1) + entries.reduce((sum, [id, photo]) => sum + JSON.stringify(id).length + 1 + photo.length + 2, 0);
}

/** The catches that carry a photo, newest first: the game's snapshots and the player's own pictures. */
export function catchesWithPhotos(catches: readonly CatchEntry[], hasPhoto: (id: string) => boolean) {
  return catches.filter((entry) => hasPhoto(entry.id));
}

/** The angler's longest and heaviest fish that have no picture yet, the heaviest first when one fish is both. */
export function unpicturedBests(catches: readonly CatchEntry[], hasPhoto: (id: string) => boolean): { entry: CatchEntry; kind: "length" | "weight" }[] {
  const { longest, heaviest } = biggestOf(catches.filter(ownFish));
  const rows = [heaviest ? { entry: heaviest, kind: "weight" as const } : null, longest ? { entry: longest, kind: "length" as const } : null].flatMap((row) => (row ? [row] : []));
  return rows.filter((row, index) => !hasPhoto(row.entry.id) && rows.findIndex((other) => other.entry.id === row.entry.id) === index);
}

/** The years the photos come from, newest first, with how many each. */
export function photoYears(pictured: readonly CatchEntry[], yearOf: (entry: CatchEntry) => string): [string, number][] {
  const perYear = new Map<string, number>();
  for (const entry of pictured) perYear.set(yearOf(entry), (perYear.get(yearOf(entry)) ?? 0) + 1);
  return [...perYear].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Photos already newest first, cut into runs by the month they count in: a night's small hours go with its outing's day. */
function photoMonths(entries: readonly CatchEntry[], monthOf: (entry: CatchEntry) => string) {
  const months: { month: string; entries: CatchEntry[] }[] = [];
  for (const entry of entries) {
    const month = monthOf(entry);
    const last = months[months.length - 1];
    if (last && last.month === month) last.entries.push(entry);
    else months.push({ month, entries: [entry] });
  }
  return months;
}

/** Every photo in the book as a wall of pictures, each opening its catch. */
export function PhotosPage() {
  const { book, storedBook, photos, photoFor, removePhotos } = useLogbook();
  useT();
  const { shown, showMore, box } = useShowMore("photos");
  const [made, setMade] = useState<number | null>(null);
  const roomNote = useRef<HTMLParagraphElement>(null);
  // How full the room kept for photos is, and what of the game's could go to free some.
  // A kept photo never reads as 0%.
  // Against the room a save really leaves them: a big book beside them leaves less than the room kept for photos.
  const fill = Math.min(100, Math.max(Object.keys(photos).length > 0 ? 1 : 0, Math.round((storedSize(photos) / photoRoomChars()) * 100)));
  const spare = fill >= 50 ? spareGameSnapshots(storedBook, photos) : [];
  const clear = spare.slice(0, 10);
  const makeRoom = () => {
    if (!window.confirm(tn(clear.length, "Remove the lake's oldest snapshot? Your own photos and each kind's heaviest fish keep theirs.", "Remove the lake's {n} oldest snapshots? Your own photos and each kind's heaviest fish keep theirs."))) return;
    if (!removePhotos(clear)) return;
    setMade(clear.length);
    // The button goes once there is room, so focus waits on the word of what was removed.
    roomNote.current?.focus();
  };
  // The kind picked lives in the address, so Back from a photo's fish returns to it.
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind");
  const setKind = (next: string | null) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next) out.set("kind", next);
        else out.delete("kind");
        return out;
      },
      { replace: true },
    );
  // One water at a time too, kept in the address beside the kind.
  const water = params.get("water");
  const setWater = (next: string | null) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next) out.set("water", next);
        else out.delete("water");
        return out;
      },
      { replace: true },
    );
  const pictured = catchesWithPhotos(catchesNewestFirst(book), (id) => photoFor(id) !== null);
  const kinds = speciesCounts(pictured);
  // A kind picked that has since lost its last photo shows them all again.
  const picked = kind && kinds.some((row) => row.species.trim().toLowerCase() === kind) ? kind : null;
  const ofKind = picked ? pictured.filter((entry) => entry.species.trim().toLowerCase() === picked) : pictured;
  // The waters with photos, most pictured first; a water picked that has none left shows them all again.
  const perWater = new Map<string, number>();
  for (const entry of pictured) perWater.set(entry.spotId, (perWater.get(entry.spotId) ?? 0) + 1);
  const waters = [...perWater]
    .map(([id, count]) => ({ id, name: spotById(book, id)?.name ?? t("Unknown water"), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const pickedWater = water && waters.some((row) => row.id === water) ? water : null;
  const ofWater = pickedWater ? ofKind.filter((entry) => entry.spotId === pickedWater) : ofKind;
  // One season at a time too, once the photos span more than one: a night's small hours count on its outing's day.
  const yearOf = (entry: CatchEntry) => bookFishDay(book, entry).slice(0, 4);
  const years = photoYears(pictured, yearOf);
  const perYear = new Map(years);
  const year = params.get("year");
  const setYear = (next: string | null) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current);
        if (next) out.set("year", next);
        else out.delete("year");
        return out;
      },
      { replace: true },
    );
  const pickedYear = year && perYear.has(year) ? year : null;
  const all = pickedYear ? ofWater.filter((entry) => yearOf(entry) === pickedYear) : ofWater;
  // Largest first puts the trophy shots at the top, one run with no month heads, as the Catches list does.
  const [largest, setLargest] = useLargestOrder();
  const { visible, more } = catchPage(largest ? largestFirst(all) : all, shown);
  const monthOf = (entry: CatchEntry) => bookFishDay(book, entry).slice(0, 7);
  // Each row of chips counts the photos the other two picks leave, so a chip's number is what tapping it shows.
  const kindOf = (entry: CatchEntry) => entry.species.trim().toLowerCase();
  const inKind = (entry: CatchEntry) => !picked || kindOf(entry) === picked;
  const inWater = (entry: CatchEntry) => !pickedWater || entry.spotId === pickedWater;
  const inYear = (entry: CatchEntry) => !pickedYear || yearOf(entry) === pickedYear;
  const tally = (entries: CatchEntry[], keyOf: (entry: CatchEntry) => string) => {
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(keyOf(entry), (counts.get(keyOf(entry)) ?? 0) + 1);
    return counts;
  };
  const kindCounts = tally(pictured.filter((entry) => inWater(entry) && inYear(entry)), kindOf);
  const waterCounts = tally(pictured.filter((entry) => inKind(entry) && inYear(entry)), (entry) => entry.spotId);
  const yearCounts = tally(pictured.filter((entry) => inKind(entry) && inWater(entry)), yearOf);
  const unpictured = unpicturedBests(book.catches, (id) => photoFor(id) !== null);
  // The angler's own fish still without a picture, counted as /catches counts them, opening the search that lists them.
  const counted = countedFish(book.catches);
  const bare = counted.filter((entry) => photoFor(entry.id) === null).length;
  const bareSearch = ["-photo", "-game", ...(counted.some((entry) => isSampleCatch(entry.id)) ? [] : hasSampleFish(book) ? ["-sample"] : [])].join(" ");
  const monthCounts = new Map(photoMonths(all, monthOf).map((group) => [group.month, group.entries.length]));

  return (
    <div className="sheet">
      <header className="sheet-head">
        <div>
          <p className="eyebrow">
            <Link to="/catches">{t("Catch log")}</Link>
          </p>
          <h1>{t("Photos")}</h1>
          <p className="lede">{t("Every fish in the book with a picture, newest first.")}</p>
        </div>
      </header>
      {all.length > 0 ? (
        <p ref={roomNote} className="meta photo-room" tabIndex={-1}>
          {t("Photos fill {percent}% of the room this browser keeps for them.", { percent: fill })}
          {clear.length > 0 ? (
            <>
              {" "}
              <button type="button" className="text-button" onClick={makeRoom}>
                {t("Make room")}
              </button>
            </>
          ) : null}
          <span role="status">{made !== null ? ` ${t("Snapshots removed: {count}.", { count: made })}` : ""}</span>
        </p>
      ) : null}
      {/* The book's biggest fish still without a picture: the one most worth adding a photo to. */}
      {bare > 0 && pictured.length > 0 ? (
        <p className="meta photo-missing">
          <Link to={`/catches?${new URLSearchParams({ [FIND_PARAM]: bareSearch }).toString()}`}>{t("Fish without a photo: {n}", { n: bare })}</Link>
        </p>
      ) : null}
      {unpictured.length > 0 ? (
        <p className="meta photo-missing">
          {unpictured.map(({ entry, kind }, index) => (
            <span key={kind}>
              {index > 0 ? " · " : ""}
              <Link to={catchLink(entry.id)} state={FROM_LIST}>
                {t(kind === "weight" ? "Your heaviest fish has no photo: {fish}" : "Your longest fish has no photo: {fish}", { fish: `${t(entry.species)}, ${measuresText(entry)}` })}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      {/* One kind at a time, once the photos hold more than one. */}
      {kinds.length > 1 ? (
        <p className="bests-scope photo-kinds" role="group" aria-label={t("Which kinds")}>
          <button type="button" className="text-button" aria-pressed={!picked} onClick={() => setKind(null)}>
            {t("All kinds")}
          </button>
          {/* A chip the other picks leave no photos for goes, unless it is the one picked, so it can be unpicked. */}
          {kinds.map((row) => {
            const count = kindCounts.get(row.species.trim().toLowerCase()) ?? 0;
            const on = picked === row.species.trim().toLowerCase();
            return count > 0 || on ? (
              <button key={row.species} type="button" className="text-button" aria-pressed={on} onClick={() => setKind(row.species.trim().toLowerCase())}>
                {t(row.species)} ({count})
              </button>
            ) : null;
          })}
        </p>
      ) : null}
      {waters.length > 1 ? (
        <p className="bests-scope photo-kinds" role="group" aria-label={t("Which waters")}>
          <button type="button" className="text-button" aria-pressed={!pickedWater} onClick={() => setWater(null)}>
            {t("All waters")}
          </button>
          {waters.map((row) => {
            const count = waterCounts.get(row.id) ?? 0;
            return count > 0 || pickedWater === row.id ? (
              <button key={row.id} type="button" className="text-button" aria-pressed={pickedWater === row.id} onClick={() => setWater(row.id)}>
                {row.name} ({count})
              </button>
            ) : null;
          })}
        </p>
      ) : null}
      {years.length > 1 ? (
        <p className="bests-scope photo-kinds" role="group" aria-label={t("Which years")}>
          <button type="button" className="text-button" aria-pressed={!pickedYear} onClick={() => setYear(null)}>
            {t("All years")}
          </button>
          {years.map(([value]) => {
            const count = yearCounts.get(value) ?? 0;
            return count > 0 || pickedYear === value ? (
              <button key={value} type="button" className="text-button" aria-pressed={pickedYear === value} onClick={() => setYear(value)}>
                {value} ({count})
              </button>
            ) : null;
          })}
        </p>
      ) : null}
      {all.length > 1 ? <MatchOrder largest={largest} onChange={setLargest} /> : null}
      {all.length === 0 && pictured.length > 0 ? (
        <p className="empty">{pickedYear ? t("No photos match these picks.") : t("No photos of this kind from this water.")}</p>
      ) : all.length === 0 ? (
        <p className="empty">{t("No photos yet. Fish landed on the lake keep a snapshot, and a catch you log can carry one.")}</p>
      ) : (
        <div ref={box} className="paged-list">
          {(largest ? [{ month: "", entries: visible }] : photoMonths(visible, monthOf)).map((group) => (
            <section key={group.month || "largest"} aria-label={group.month ? monthName(group.month) : t("Largest first")}>
              {group.month ? (
                <h2 className="month-head">
                  {monthName(group.month)}
                  {" · "}
                  {tn(monthCounts.get(group.month) ?? group.entries.length, "{n} photo", "{n} photos")}
                </h2>
              ) : null}
              <ul className="photo-wall">
                {group.entries.map((entry) => {
                  const size = measuresText(entry);
                  return (
                    <li key={entry.id}>
                      {/* Stepping on from the fish goes through the photos shown here, not the whole book. */}
                      {/* The water picked too, when it has a name to search by. */}
                      <Link to={catchLink(entry.id, `catches${largest ? "-largest" : ""}:${picked ? `${exactTerm("species", t(entry.species))} + ` : ""}${pickedWater && spotById(book, pickedWater) ? `${exactTerm("water", spotById(book, pickedWater)!.name)} + ` : ""}${pickedYear ? `${pickedYear} + ` : ""}photo`)} state={FROM_LIST}>
                        <img src={photoFor(entry.id)!} alt="" loading="lazy" />
                        <span className="photo-caption">
                          <strong>{t(entry.species)}</strong>
                          <small>
                            {/* A night's small-hours fish says its clock time, as the catch cards do. */}
                            {size} · {bookFishDay(book, entry) === localDate(new Date(entry.caughtAt)) ? formatDay(bookFishDay(book, entry)) : formatClock(entry.caughtAt)}
                            {spotById(book, entry.spotId) ? ` · ${spotById(book, entry.spotId)!.name}` : ""}
                          </small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {more > 0 && (
            <div className="show-more">
              <p role="status">{t("{shown} of {total} photos", { shown: visible.length, total: all.length })}</p>
              <button type="button" className="field-primary inline" onClick={showMore}>
                {t("Show {count} more", { count: more })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
