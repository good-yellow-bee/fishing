import { useState } from "react";
import { Link } from "react-router-dom";
import { catchesNewestFirst, localDate, spotById, type CatchEntry } from "@stillwater/shared";
import { t, useT } from "../i18n";
import { measureText } from "../i18n/content";
import { formatDay } from "./format";
import { useLogbook } from "./LogbookState";
import { CATCH_PAGE, catchPage } from "./PagedCatches";
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
  const { book, photoFor } = useLogbook();
  useT();
  const [shown, setShown] = useState(CATCH_PAGE);
  const all = catchesWithPhotos(catchesNewestFirst(book), (id) => photoFor(id) !== null);
  const { visible, more } = catchPage(all, shown);

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
      {all.length === 0 ? (
        <p className="empty">{t("No photos yet. Fish landed on the lake keep a snapshot, and a catch you log can carry one.")}</p>
      ) : (
        <>
          {photoMonths(visible).map((group) => (
            <section key={group.month} aria-label={monthName(group.month)}>
              <h2 className="month-head">{monthName(group.month)}</h2>
              <ul className="photo-wall">
                {group.entries.map((entry) => {
                  const size = measureText(entry.measure);
                  return (
                    <li key={entry.id}>
                      <Link to={`/catches/${entry.id}`}>
                        <img src={photoFor(entry.id)!} alt={`${t(entry.species)}, ${size}`} loading="lazy" />
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
              <button type="button" className="field-primary inline" onClick={() => setShown((count) => count + CATCH_PAGE)}>
                {t("Show {count} more", { count: more })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
