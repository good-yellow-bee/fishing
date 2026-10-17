import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogbook } from "./LogbookState";
import { STORAGE_FULL } from "./storage";
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
  useT();

  useEffect(() => {
    if (!undoable) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Escape in a field (clearing the search) or in a question ("Keep" in a delete prompt) is about that, not this bar.
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [role=dialog], [role=alertdialog]")) return;
      dismissUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoable, dismissUndo]);

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
  if (!undoable) return <div role="status" />;
  const onUndo = () => {
    // Back to the page the entry was deleted from, now that it is there again.
    const from = undoDelete();
    if (from) navigate(from);
    // The button goes with the bar: focus moves to the top of the page it lands on.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("main h1")?.focus());
  };
  return (
    <div role="status">
      <div className="undo-bar">
        <span>{t(DELETED[undoable])}</span>
        <button type="button" className="text-button" onClick={onUndo}>
          {t("Undo")}
        </button>
        <button type="button" className="text-button undo-close" onClick={dismissUndo} aria-label={t("Dismiss")}>
          ×
        </button>
      </div>
    </div>
  );
}
