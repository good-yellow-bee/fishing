import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { t, useT } from "../i18n";
import { renameInBook, type NameField } from "./bookRename";
import { exactTerm, findLink } from "./findLinks";
import { useLogbook } from "./LogbookState";
import { useTackleIfAny } from "./gear/TackleState";
import { renamedTackle } from "./gear/renamedTackle";

/** Where a renamed kind or lure is found again under its new name. */
function pageOf(field: NameField, name: string) {
  return field === "species" ? `/species/${encodeURIComponent(name)}` : findLink(exactTerm("lure", t(name)));
}

/** A name fixed once for every fish of the kind, or on the lure; a name already in the book merges the two. */
export function RenameKind({ field, name }: { field: NameField; name: string }) {
  // The book as stored: the shown one has the sample week in the player's language, which must not be saved.
  const { storedBook, changeBook } = useLogbook();
  useT();
  const navigate = useNavigate();
  const tackle = useTackleIfAny();
  const [typed, setTyped] = useState(() => t(name));
  const [error, setError] = useState("");
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (typed.trim() === t(name)) return;
    const result = renameInBook(storedBook, field, name, typed);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // Typed the way the book already has it: nothing to save or undo.
    if (result.book.catches.every((entry, index) => entry === storedBook.catches[index])) {
      navigate(pageOf(field, result.name), { replace: true });
      return;
    }
    // The packed lists follow a lure's new name, so its record still finds its fish; Undo puts them back with the book.
    const lists = field === "lure" && tackle ? renamedTackle(tackle.items, name, result.name) : null;
    const before = tackle?.items ?? [];
    if (!changeBook("rename", result.book, lists ? () => tackle?.replaceTackle([...before]) : undefined)) return;
    if (lists) tackle?.replaceTackle(lists);
    navigate(pageOf(field, result.name), { replace: true });
  };
  return (
    <details className="rename-kind">
      <summary>{t("Rename or merge")}</summary>
      <form onSubmit={onSubmit} className="rename-kind-form">
        <label>
          {field === "species" ? t("New name for every {name}", { name: t(name) }) : t("New name for {name} on every fish", { name: t(name) })}
          <input
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby="rename-kind-hint"
          />
        </label>
        <p className="field-hint" id="rename-kind-hint">
          {t("A name already in the book merges the two.")}
        </p>
        {error ? (
          <p className="field-error" role="alert">
            {t(error)}
          </p>
        ) : null}
        <button type="submit" className="field-primary inline">
          {t("Rename")}
        </button>
      </form>
    </details>
  );
}
