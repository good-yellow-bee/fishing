import { useEffect, useState } from "react";
import { errorText, getStewards, type StewardsBoard } from "../api";
import { t, useT } from "../i18n";

/** This week's stewards on the lodge board: the anglers who let the most fish go since Monday (UTC). */
export function StewardsCard() {
  useT();
  const [board, setBoard] = useState<StewardsBoard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getStewards()
      .then((next) => live && setBoard(next))
      .catch((err: Error) => live && setError(errorText(err.message)));
    return () => {
      live = false;
    };
  }, []);

  if (error) return <p className="warn" role="alert">{error}</p>;
  if (!board) return null;
  return (
    <section className="derby-card" aria-labelledby="stewards-title">
      <p>
        <strong id="stewards-title">{t("Stewards of the week: the most fish let go")}</strong>
        <br />
        <small>{t("Since Monday 00:00 UTC. Fish let go keep their banks stocked.")}</small>
      </p>
      {board.entries.length > 0 ? (
        <ol className="derby-entries">
          {board.entries.map((row) => (
            <li key={row.userId} data-you={board.you && row.rank === board.you.rank ? "1" : "0"}>
              {t("{rank}. {name} · {count} let go", { rank: row.rank, name: row.displayName, count: row.count })}
            </li>
          ))}
        </ol>
      ) : (
        <p>{t("No one has let a fish go yet this week.")}</p>
      )}
      {board.you && board.you.rank > 10 && <p>{t("You: #{rank}, {count} let go", { rank: board.you.rank, count: board.you.count })}</p>}
    </section>
  );
}
