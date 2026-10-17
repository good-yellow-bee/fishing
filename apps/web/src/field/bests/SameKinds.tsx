import { t, useT } from "../../i18n";
import { useLogbook } from "../LogbookState";
import { renameInBook } from "../bookRename";
import { offPlayLake } from "../playLake";
import { kindPairs } from "./kindPairs";

/** One kind of fish kept under two names, offered as one: its records and counts stop splitting in two. */
export function SameKinds() {
  // The book as stored: the shown one has the sample week in the player's language.
  const { storedBook, changeBook } = useLogbook();
  useT();
  const pairs = kindPairs(storedBook.catches.filter(offPlayLake), t);
  if (pairs.length === 0) return null;
  return (
    <section className="same-kinds" aria-label={t("Same kind, two names")}>
      {pairs.map((pair) => (
        <p key={`${pair.from}\u0000${pair.into}`} className="form-note">
          {t("{shown} is in the book under two names: {from} ({fromCount}) and {into} ({intoCount}).", {
            shown: pair.shown,
            from: pair.from,
            fromCount: pair.fromCount,
            into: pair.into,
            intoCount: pair.intoCount,
          })}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const result = renameInBook(storedBook, "species", pair.from, pair.into);
              if (result.ok) changeBook("rename", result.book);
            }}
          >
            {t("Join them")}
          </button>
        </p>
      ))}
    </section>
  );
}
