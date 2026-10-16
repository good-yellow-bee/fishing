import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { t, useT } from "../i18n";
import { renameInBook, type NameField } from "./bookRename";
import { exactTerm, findLink } from "./findLinks";
import { useLogbook } from "./LogbookState";

/** Where a renamed kind or lure is found again under its new name. */
function pageOf(field: NameField, name: string) {
  return field === "species" ? `/species/${encodeURIComponent(name)}` : findLink(exactTerm("lure", t(name)));
}

/** A name fixed once for every fish of the kind, or on the lure; a name already in the book merges the two. */
export function RenameKind({ field, name }: { field: NameField; name: string }) {
  const { book, changeBook } = useLogbook();
  useT();
  const navigate = useNavigate();
  const [typed, setTyped] = useState(() => t(name));
  const [error, setError] = useState("");
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (typed.trim() === t(name)) return;
    const result = renameInBook(book, field, name, typed);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (changeBook("rename", result.book)) navigate(pageOf(field, result.name), { replace: true });
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
