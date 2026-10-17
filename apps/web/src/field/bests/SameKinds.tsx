import { useRef } from "react";
import { t, useT } from "../../i18n";
import { PL } from "../../i18n/pl";
import { useLogbook } from "../LogbookState";
import { renameInBook } from "../bookRename";
import { offPlayLake } from "../playLake";
import { kindPairs } from "./kindPairs";

/** A stored name as Polish writes it, whatever the reader's language: "European perch" and "Okoń" meet there. */
const inPolish = (name: string) => {
  const line = PL[name];
  return typeof line === "string" ? line : name;
};

/** One kind of fish kept under two names, offered as one: its records and counts stop splitting in two. */
export function SameKinds() {
  // The book as stored: the shown one has the sample week in the player's language.
  const { storedBook, changeBook } = useLogbook();
  useT();
  const box = useRef<HTMLElement>(null);
  const pairs = kindPairs(storedBook.catches.filter(offPlayLake), t, inPolish);
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
