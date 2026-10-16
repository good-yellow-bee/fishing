import { useState } from "react";
import { Link } from "react-router-dom";
import { CATCH_PHOTO_STORE_MAX_CHARS, catchesNewestFirst, localDate, spotById, type CatchEntry } from "@stillwater/shared";
import { spareGameSnapshots } from "./keepCatch";
import { t, tn, useT } from "../i18n";
import { measuresText } from "../i18n/content";
import { formatDay } from "./format";
import { useLogbook } from "./LogbookState";
import { catchPage, useShowMore } from "./PagedCatches";
import { catchMonth, monthName } from "./tripMonths";

/** The catches that carry a photo, newest first: the game's snapshots and the player's own pictures. */
export function catchesWithPhotos(catches: readonly CatchEntry[], hasPhoto: (id: string) => boolean) {
  return catches.filter((entry) => hasPhoto(entry.id));
}

/** Photos already newest first, cut into runs by the month they were caught. */
function photoMonths(entries: readonly CatchEntry[]) {
  const months: { month: string; entries: CatchEntry[] }[] = [];
  for (const entry of entries) {
    const month = catchMonth(entry);
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
  const { shown, showMore, box } = useShowMore();
  const [made, setMade] = useState<number | null>(null);
  // How full the room kept for photos is, and what of the game's could go to free some.
  const fill = Math.min(100, Math.round((JSON.stringify(photos).length / CATCH_PHOTO_STORE_MAX_CHARS) * 100));
  const spare = fill >= 50 ? spareGameSnapshots(storedBook, photos) : [];
  const clear = spare.slice(0, 10);
  const makeRoom = () => {
    if (!window.confirm(t("Remove the lake's {count} oldest snapshots? Your own photos and each kind's heaviest fish keep theirs.", { count: clear.length }))) return;
    if (removePhotos(clear)) setMade(clear.length);
  };
  const all = catchesWithPhotos(catchesNewestFirst(book), (id) => photoFor(id) !== null);
  const { visible, more } = catchPage(all, shown);
  const monthCounts = new Map(photoMonths(all).map((group) => [group.month, group.entries.length]));

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
        <p className="meta photo-room">
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
      {all.length === 0 ? (
        <p className="empty">{t("No photos yet. Fish landed on the lake keep a snapshot, and a catch you log can carry one.")}</p>
      ) : (
        <div ref={box} className="paged-list">
          {photoMonths(visible).map((group) => (
            <section key={group.month} aria-label={monthName(group.month)}>
              <h2 className="month-head">
                {monthName(group.month)}
                {" · "}
                {tn(monthCounts.get(group.month) ?? group.entries.length, "{n} photo", "{n} photos")}
              </h2>
              <ul className="photo-wall">
                {group.entries.map((entry) => {
                  const size = measuresText(entry);
                  return (
                    <li key={entry.id}>
                      <Link to={`/catches/${entry.id}`}>
                        <img src={photoFor(entry.id)!} alt="" loading="lazy" />
                        <span className="photo-caption">
                          <strong>{t(entry.species)}</strong>
                          <small>
                            {size} · {formatDay(localDate(new Date(entry.caughtAt)))}
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
