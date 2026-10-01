import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sheet-head">
        <div>{children}</div>
        <div className="sheet-actions">
          <Link to={editTo}>Edit</Link>
          <button type="button" className="text-button" onClick={() => setOpen(true)}>
            Delete
          </button>
          {aside}
        </div>
      </header>
      {open ? (
        <p className="confirm-ask">
          {ask}{" "}
          <button type="button" className="text-button" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="text-button" onClick={() => setOpen(false)}>
            Keep
          </button>
        </p>
      ) : null}
    </>
  );
}
