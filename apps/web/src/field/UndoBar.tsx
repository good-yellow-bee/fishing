import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLogbook } from "./LogbookState";
import { focusPageHeading } from "./pageFocus";
import { leftBackTo, movedOnSince } from "./leaveDeleted";
import { STORAGE_FULL } from "./storage";
import { ALL_LISTS, useTackleIfAny } from "./gear/TackleState";
import { t, useT } from "../i18n";

const DELETED = {
  catch: "Fish deleted.",
  spot: "Water deleted, with its outings and fish.",
  trip: "Outing deleted; its fish stay in the book.",
  sample: "Sample book restored.",
  blank: "The sample waters and fish are gone. Add your first water to begin.",
  unsample: "The sample week is gone. Your own entries stay.",
  rename: "Fish renamed.",
  merge: "Waters merged.",
  file: "Fish added to their outings.",
} as const;

/** After a delete, a quiet bar with one way back, until the book changes again. */
export function UndoBar() {
  const { undoable, undoDelete, dismissUndo, saveError, dismissSaveError, photos } = useLogbook();
  const navigate = useNavigate();
  const location = useLocation();
  const tackle = useTackleIfAny();
  const bar = useRef<HTMLDivElement>(null);
  useT();
  // Closed from inside the bar, focus goes to the top of the page rather than falling to the document.
  const dismiss = () => {
    const inside = bar.current?.contains(document.activeElement) ?? false;
    dismissUndo();
    if (inside) requestAnimationFrame(() => focusPageHeading());
  };

  useEffect(() => {
    if (!undoable) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Escape in a field (clearing the search) or in a question ("Keep" in a delete prompt) is about that, not this bar.
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [role=dialog], [role=alertdialog]")) return;
      dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The live region stays in the page so the line is read out when it appears.
  if (saveError) {
    return (
      <div role="status">
        <div className="undo-bar undo-bar-error">
          <span>
            {saveError}
            {/* Photos take most of the room: their page is where some can be let go. */}
            {saveError === t(STORAGE_FULL) && Object.keys(photos).length > 0 ? (
              <>
                {" "}
                <Link to="/photos">{t("Make room on the photos page")}</Link>
              </>
            ) : null}
          </span>
          <button type="button" className="text-button undo-close" onClick={dismissSaveError} aria-label={t("Dismiss")}>
            ×
          </button>
        </div>
      </div>
    );
  }
  // A merge or rename the book took but the packed lists could not keep: no list owns it, so the bar says it.
  if (tackle?.unsavedTrip === ALL_LISTS) {
    return (
      <div role="status">
        <div className="undo-bar undo-bar-error">
          <span>{t("The packed lists could not be updated in this browser. They stay as they are until this page is closed.")}</span>
          <button type="button" className="text-button undo-close" onClick={tackle.dismissUnsaved} aria-label={t("Dismiss")}>
            ×
          </button>
        </div>
      </div>
    );
  }
  if (!undoable) return <div role="status" />;
  const onUndo = () => {
    // Back to the page the entry was deleted from, now that it is there again.
    // In place of the page it went to, so Back doesn't pass through that page, or this one, twice; after a delete
    // that went Back to its list, forward from the list again.
    const undone = undoDelete();
    const from = undone?.from;
    // Pressed on another page since, it comes forward from there, leaving that page in history.
    const here = location.pathname + location.search;
    if (from && from !== here) navigate(from, { replace: !leftBackTo(from) && !movedOnSince(from, here), state: undone?.state });
    // The button goes with the bar: focus moves to the top of the page it lands on.
    requestAnimationFrame(() => focusPageHeading());
  };
  return (
    <div role="status">
      <div className="undo-bar" ref={bar}>
        <span>{t(DELETED[undoable])}</span>
        <button type="button" className="text-button" onClick={onUndo}>
          {t("Undo")}
        </button>
        <button type="button" className="text-button undo-close" onClick={dismiss} aria-label={t("Dismiss")}>
          ×
        </button>
      </div>
    </div>
  );
}
