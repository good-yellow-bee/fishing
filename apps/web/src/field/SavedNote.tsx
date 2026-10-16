import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { t, useT } from "../i18n";

/** What a page can say it just saved, passed along in the link's state. */
export const SAVED_LINES = {
  catch: "Fish saved.",
  catchEdit: "Changes saved.",
} as const;

export type SavedKind = keyof typeof SAVED_LINES;

/** The link state that makes the next page say the save went through, and `news` after it ("First Walleye in the book."). */
export function savedState(kind: SavedKind, news?: string | null) {
  return { state: { saved: kind, ...(news ? { news } : {}) } };
}

/** After a save that lands on another page, a short line that it went through, gone after a few seconds. */
export function SavedNote() {
  useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [shown, setShown] = useState<{ kind: SavedKind; on: string; news?: string } | null>(null);
  const arrived = (location.state as { saved?: SavedKind } | null)?.saved;
  const news = (location.state as { news?: unknown } | null)?.news;

  useEffect(() => {
    if (!arrived || !(arrived in SAVED_LINES)) return;
    setShown({ kind: arrived, on: location.pathname, ...(typeof news === "string" ? { news } : {}) });
    // Said once: a reload or a return to this page doesn't say it again.
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
  }, [arrived, news, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!shown) return;
    // A line of news takes longer to read than "Fish saved.".
    const timer = window.setTimeout(() => setShown(null), shown.news ? 7000 : 4000);
    return () => window.clearTimeout(timer);
  }, [shown]);
  // Only on the page the save landed on.
  const here = shown && shown.on === location.pathname ? shown : null;

  // The live region stays in the page so the line is read out when it appears.
  return (
    <div role="status">
      {here ? (
        <div className="undo-bar saved-note">
          <span>
            {t(SAVED_LINES[here.kind])}
            {here.news ? ` ${here.news}` : ""}
          </span>
          <button type="button" className="text-button undo-close" onClick={() => setShown(null)} aria-label={t("Dismiss")}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
