import { useEffect, useRef } from "react";
import { getLang, loadPolish, polishBook, t, useT } from "../../i18n";
import { useLogbook } from "../LogbookState";
import { renameInBook } from "../bookRename";
import { countedFish } from "../milestones";
import { kindPairs } from "./kindPairs";
import { bookSpelling } from "../gear/pieceKey";
import { kindNames } from "../speciesLink";

/** A stored name as Polish writes it, whatever the reader's language: "European perch" and "Okoń" meet there. */
const inPolish = (name: string) => {
  // As the dictionary spells it: "zander " typed by hand meets "Sandacz" too.
  const line = polishBook()[bookSpelling(name)];
  return typeof line === "string" ? line : name;
};

/** One kind of fish kept under two names, offered as one: its records and counts stop splitting in two. */
export function SameKinds() {
  // The book as stored: the shown one has the sample week in the player's language.
  const { storedBook, changeBook } = useLogbook();
  useT();
  // English readers fetch the Polish book here too; useT re-renders once it lands.
  useEffect(() => {
    loadPolish().catch(() => {});
  }, []);
  const box = useRef<HTMLElement>(null);
  // The fish the counts below hold: a sample fish under the other name is no slip of the angler's.
  // Named as the kinds list names it: in English the book's most-written spelling, the same before and after the Polish
  // book lands; in Polish the dictionary's.
  const own = countedFish(storedBook.catches);
  const kindName = kindNames(own);
  const pairs = kindPairs(own, (name) => (getLang() === "pl" ? t(bookSpelling(name)) : kindName(name)), inPolish);
  if (pairs.length === 0) return null;
  return (
    <section ref={box} className="same-kinds" aria-label={t("Same kind, two names")}>
      {pairs.map((pair, index) => {
        const id = `same-kind-${index}`;
        return (
          <p key={`${pair.from}\u0000${pair.into}`} className="form-note">
            <span id={id}>
              {t("{shown} is in the book under two names: {from} ({fromCount}) and {into} ({intoCount}).", {
                shown: pair.shown,
                from: pair.from,
                fromCount: pair.fromCount,
                into: pair.into,
                intoCount: pair.intoCount,
              })}
            </span>{" "}
            <button
              type="button"
              className="text-button"
              aria-describedby={id}
              onClick={() => {
                const result = renameInBook(storedBook, "species", pair.from, pair.into);
                if (!result.ok || !changeBook("rename", result.book)) return;
                // The line goes with the join: focus moves on to the next pair, or to the list of kinds below.
                const section = box.current;
                setTimeout(() => {
                  const buttons = section?.querySelectorAll<HTMLButtonElement>("button") ?? [];
                  const next = buttons[index] ?? buttons[index - 1];
                  if (next?.isConnected) next.focus();
                  else document.querySelector<HTMLElement>("#by-species")?.focus();
                }, 0);
              }}
            >
              {t("Join them")}
            </button>
          </p>
        );
      })}
    </section>
  );
}
