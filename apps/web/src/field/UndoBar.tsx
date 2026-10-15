import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLogbook } from "./LogbookState";
import { t, useT } from "../i18n";

const DELETED = {
  catch: "Fish deleted.",
  spot: "Water deleted, with its outings and fish.",
  trip: "Outing deleted; its fish stay in the book.",
} as const;

/** After a delete, a quiet bar with one way back, until the book changes again. */
export function UndoBar() {
  const { undoable, undoDelete, dismissUndo } = useLogbook();
  const navigate = useNavigate();
  useT();

  useEffect(() => {
    if (!undoable) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoable, dismissUndo]);

  if (!undoable) return null;
  const onUndo = () => {
    // Back to the page the entry was deleted from, now that it is there again.
    const from = undoDelete();
    if (from) navigate(from);
  };
  return (
    <div className="undo-bar" role="status">
      <span>{t(DELETED[undoable])}</span>
      <button type="button" className="text-button" onClick={onUndo}>
        {t("Undo")}
      </button>
      <button type="button" className="text-button" onClick={dismissUndo} aria-label={t("Dismiss")}>
        ×
      </button>
    </div>
  );
}
