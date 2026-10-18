import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { t, useT } from "../i18n";
import { formatClock } from "./format";
import { useLogbook } from "./LogbookState";

/** What a page can say it just saved, passed along in the link's state. */
export const SAVED_LINES = {
  catch: "Fish saved.",
  catchEdit: "Changes saved.",
  trip: "Outing saved.",
} as const;

export type SavedKind = keyof typeof SAVED_LINES;

/** The link state that makes the next page say the save went through, and `news` after it ("First Walleye in the book."). */
/** `at` is the fish's time, said with the line so a quick run of saves shows a wrong one at once. */
export function savedState(kind: SavedKind, news?: string | null, at?: string) {
  return { state: { saved: kind, ...(news ? { news } : {}), ...(at ? { at } : {}) } };
}

/** A save that went Back to the page its form was opened from: said there, since Back carries no link state. */
let afterBack: SavedKind | null = null;
export function sayAfterBack(kind: SavedKind) {
  afterBack = kind;
}

/** After a save that lands on another page, a short line that it went through, gone after a few seconds. */
export function SavedNote() {
  useT();
  const location = useLocation();
  const navigate = useNavigate();
  const { undoable, saveError } = useLogbook();
  const [shown, setShown] = useState<{ kind: SavedKind; on: string; news?: string; at?: string } | null>(null);
  const arrived = (location.state as { saved?: SavedKind } | null)?.saved;
  const news = (location.state as { news?: unknown } | null)?.news;
  const at = (location.state as { at?: unknown } | null)?.at;

  useEffect(() => {
    if (!afterBack) return;
    setShown({ kind: afterBack, on: location.pathname });
    afterBack = null;
  }, [location.key, location.pathname]);

  useEffect(() => {
    if (!arrived || !(arrived in SAVED_LINES)) return;
    setShown({ kind: arrived, on: location.pathname, ...(typeof news === "string" ? { news } : {}), ...(typeof at === "string" && Number.isFinite(Date.parse(at)) ? { at } : {}) });
    // Said once: a reload or a return to this page doesn't say it again. Whatever else the link carried (that the page
    // was opened from a list) stays.
    const { saved: _saved, news: _news, at: _at, ...rest } = location.state as Record<string, unknown>;
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: Object.keys(rest).length > 0 ? rest : null });
  }, [arrived, news, at, location.pathname, location.search, location.hash, location.state, navigate]);

  useEffect(() => {
    if (!shown) return;
    // A line of news takes longer to read than "Fish saved.".
    const timer = window.setTimeout(() => setShown(null), shown.news ? 7000 : 4000);
    return () => window.clearTimeout(timer);
  }, [shown]);
  // A delete's Undo bar or a failed save sits in the same spot: the newer bar wins, and this line goes.
  const otherBar = Boolean(undoable || saveError);
  useEffect(() => {
    if (otherBar) setShown(null);
  }, [otherBar]);
  // Only on the page the save landed on.
  const here = shown && shown.on === location.pathname && !otherBar ? shown : null;

  // The live region stays in the page so the line is read out when it appears.
  return (
    <div role="status">
      {here ? (
        <div className="undo-bar saved-note">
          <span>
            {here.at ? t("Fish saved: {when}.", { when: formatClock(here.at) }) : t(SAVED_LINES[here.kind])}
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
