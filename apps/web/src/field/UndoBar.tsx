import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLogbook } from "./LogbookState";
import { t, useT } from "../i18n";

const DELETED = {
  catch: "Fish deleted.",
  spot: "Water deleted, with its outings and fish.",
  trip: "Outing deleted; its fish stay in the book.",
  sample: "Sample book restored.",
} as const;

/** After a delete, a quiet bar with one way back, until the book changes again. */
export function UndoBar() {
  const { undoable, undoDelete, dismissUndo } = useLogbook();
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
  if (!undoable) return <div role="status" />;
  const onUndo = () => {
    // Back to the page the entry was deleted from, now that it is there again.
    const from = undoDelete();
    if (from) navigate(from);
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
