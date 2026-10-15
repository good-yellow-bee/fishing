import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useT } from "../i18n";

export function EditDelete({
  editTo,
  ask,
  onDelete,
  aside,
  children,
}: {
  editTo: string;
  ask: string;
  onDelete: () => void;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const askId = useId();
  const deleteButton = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  // The question takes focus on the safe answer, so a stray Enter keeps the entry.
  useEffect(() => {
    if (open) keepButton.current?.focus();
  }, [open]);
  const keep = () => {
    setOpen(false);
    deleteButton.current?.focus();
  };

  return (
    <>
      <header className="sheet-head">
        <div>{children}</div>
        <div className="sheet-actions">
          <Link to={editTo}>{t("Edit")}</Link>
          <button ref={deleteButton} type="button" className="text-button" onClick={() => setOpen(true)} aria-expanded={open}>
            {t("Delete")}
          </button>
          {aside}
        </div>
      </header>
      {open ? (
        <p
          className="confirm-ask"
          role="alertdialog"
          aria-labelledby={askId}
          onKeyDown={(event) => {
            if (event.key === "Escape") keep();
          }}
        >
          <span id={askId}>{ask}</span>{" "}
          <button type="button" className="text-button" onClick={onDelete}>
            {t("Delete")}
          </button>
          <button ref={keepButton} type="button" className="text-button" onClick={keep}>
            {t("Keep")}
          </button>
        </p>
      ) : null}
    </>
  );
}
