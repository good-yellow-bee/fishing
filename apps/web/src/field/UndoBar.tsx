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
  useT();
  if (!undoable) return null;
  return (
    <div className="undo-bar" role="status">
      <span>{t(DELETED[undoable])}</span>
      <button type="button" className="text-button" onClick={undoDelete}>
        {t("Undo")}
      </button>
      <button type="button" className="text-button" onClick={dismissUndo} aria-label={t("Dismiss")}>
        ×
      </button>
    </div>
  );
}
