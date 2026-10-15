import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { t, useT } from "../i18n";

/** What a page can say it just saved, passed along in the link's state. */
export const SAVED_LINES = {
  catch: "Fish saved.",
  catchEdit: "Changes saved.",
} as const;

export type SavedKind = keyof typeof SAVED_LINES;

/** The link state that makes the next page say the save went through. */
export function savedState(kind: SavedKind) {
  return { state: { saved: kind } };
}

/** After a save that lands on another page, a short line that it went through, gone after a few seconds. */
export function SavedNote() {
  useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [shown, setShown] = useState<{ kind: SavedKind; on: string } | null>(null);
  const arrived = (location.state as { saved?: SavedKind } | null)?.saved;

  useEffect(() => {
    if (!arrived || !(arrived in SAVED_LINES)) return;
    setShown({ kind: arrived, on: location.pathname });
    // Said once: a reload or a return to this page doesn't say it again.
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: null });
  }, [arrived, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), 4000);
    return () => window.clearTimeout(timer);
  }, [shown]);
  // Only on the page the save landed on.
  const kind = shown && shown.on === location.pathname ? shown.kind : null;

  // The live region stays in the page so the line is read out when it appears.
  return (
    <div role="status">
      {kind ? (
        <div className="undo-bar saved-note">
          <span>{t(SAVED_LINES[kind])}</span>
          <button type="button" className="text-button undo-close" onClick={() => setShown(null)} aria-label={t("Dismiss")}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
