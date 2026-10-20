import { useEffect, useState } from "react";
import { BAG_SIZE } from "@stillwater/shared";
import { errorText, getDayBag, type DayBagBoard } from "../api";
import { t, useT } from "../i18n";
import { weightText } from "../i18n/content";

/** The day's bag on the lodge board: today's heaviest five-fish bags (UTC), and where the angler stands. */
export function DayBagCard() {
  useT();
  const [board, setBoard] = useState<DayBagBoard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getDayBag()
      .then((next) => live && setBoard(next))
      .catch((err: Error) => live && setError(errorText(err.message)));
    return () => {
      live = false;
    };
  }, []);

  if (error) return <p className="warn" role="alert">{error}</p>;
  if (!board) return null;
  return (
    <section className="derby-card" aria-labelledby="bag-title">
      <p>
        <strong id="bag-title">{t("Day's bag: each angler's {n} heaviest fish today", { n: BAG_SIZE })}</strong>
        <br />
        <small>{t("Their total weight, till 00:00 UTC, one race for the whole lodge.")}</small>
      </p>
      {board.entries.length > 0 ? (
        <ol className="derby-entries">
          {board.entries.map((row) => (
            <li key={row.userId} data-you={board.you && row.rank === board.you.rank ? "1" : "0"}>
              {t("{rank}. {name} · {weight} in {n} fish", { rank: row.rank, name: row.displayName, weight: weightText(row.total), n: row.count })}
            </li>
          ))}
        </ol>
      ) : (
        <p>{t("No one has landed a fish yet today.")}</p>
      )}
      {board.you && board.you.rank > 10 && <p>{t("You: #{rank}, {weight}", { rank: board.you.rank, weight: weightText(board.you.total) })}</p>}
    </section>
  );
}
