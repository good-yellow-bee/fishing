import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { anglerTitle, BOARD_LIMIT, FISH, weeklyFish, type BoardEntry, type BoardPeriod, type BoardView, type SpeciesRecord } from "@stillwater/shared";
import { errorText, getBoard, getSpeciesRecords } from "../api";
import { FishMark } from "../components/FishMark";
import { t, tn, useT } from "../i18n";
import { weightText } from "../i18n/content";
import { usePageTitle } from "../pageTitle";

function periodLabel(period: BoardPeriod): string {
  return period === "all" ? t("All time") : t("This week");
}

function RankMark({ rank }: { rank: number }) {
  if (rank === 1) return <span className="rank-mark gold">1</span>;
  if (rank === 2) return <span className="rank-mark silver">2</span>;
  if (rank === 3) return <span className="rank-mark bronze">3</span>;
  return <span className="rank-mark">{rank}</span>;
}

function BoardRow({ row, you }: { row: BoardEntry; you: boolean }) {
  return (
    <tr className={you ? "you" : ""} data-rank={row.rank}>
      <td>
        <RankMark rank={row.rank} />
      </td>
      <td>
        {row.displayName}
        <small className="board-title">{t(anglerTitle(row.level))}</small>
      </td>
      <td>{row.level}</td>
      <td>{row.score}</td>
      <td>{row.heaviest > 0 ? weightText(row.heaviest) : "—"}</td>
      <td>{row.species}</td>
    </tr>
  );
}

export function BoardPage() {
  const [period, setPeriod] = useState<BoardPeriod>("all");
  const [board, setBoard] = useState<BoardView | null>(null);
  const [records, setRecords] = useState<SpeciesRecord[] | null>(null);
  const [error, setError] = useState("");
  const t = useT();
  usePageTitle(`${t("Lodge board")} · Stillwater`);

  useEffect(() => {
    let live = true;
    getBoard(period)
      .then((view) => live && setBoard(view))
      .catch((err: Error) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [period]);

  useEffect(() => {
    getSpeciesRecords()
      .then(setRecords)
      .catch(() => setRecords([]));
  }, []);

  if (error) return <main className="log-page">{errorText(error)}</main>;
  if (!board) return <main className="log-page">{t("Reading the lodge board…")}</main>;

  const you = board.you;
  const week = board.period === "week";
  const points = week ? t("This week") : t("Lifetime");

  return (
    <main className="log-page board-page">
      <p>
        <Link to="/play">{t("Back to the dock")}</Link>
        {" · "}
        <Link to="/log">{t("Catch log")}</Link>
      </p>
      <h1 id="board-title">{t("Lodge board")}</h1>
      <div className="board-tabs" role="tablist" aria-label={t("Board period")}>
        {(["all", "week"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={period === option}
            className={period === option ? "active" : ""}
            onClick={() => setPeriod(option)}
          >
            {periodLabel(option)}
          </button>
        ))}
      </div>
      {(() => {
        const fish = weeklyFish();
        return (
          <p className="weekly-fish">
            <FishMark species={fish} />
            <span>
              <strong>{t("Fish of the week: {fish}", { fish: t(fish.name) })}</strong>
              <small>{t("Lands for 1.5× points until Monday 00:00 UTC.")}</small>
            </span>
          </p>
        );
      })()}
      <p>
        {week
          ? t("Top {limit} anglers by points landed since Monday 00:00 UTC. Heaviest fish this week breaks a tie.", { limit: BOARD_LIMIT })
          : t("Top {limit} anglers by lifetime points. Heaviest fish breaks a tie.", { limit: BOARD_LIMIT })}
      </p>
      {you && (
        <div className="log-summary">
          <div>
            <span className="eyebrow">{t("Your place")}</span>
            <strong>#{you.rank}</strong>
          </div>
          <div>
            <span className="eyebrow">{points}</span>
            <strong>{you.score}</strong>
          </div>
          <div>
            <span className="eyebrow">{t("Heaviest")}</span>
            <strong>{you.heaviest > 0 ? weightText(you.heaviest) : "—"}</strong>
            <small>
              {tn(you.species, "{n} species", "{n} species")} · {tn(you.catches, "{n} landed", "{n} landed")}
            </small>
          </div>
        </div>
      )}
      {/* On a phone the table scrolls sideways on its own, so it takes focus for the arrow keys and is named by the page title. */}
      <table tabIndex={0} aria-labelledby="board-title">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("Angler")}</th>
            <th>{t("Level")}</th>
            <th>{points}</th>
            <th>{t("Heaviest")}</th>
            <th>{t("Species|count")}</th>
          </tr>
        </thead>
        <tbody>
          {board.entries.map((row) => (
            <BoardRow key={row.userId} row={row} you={row.userId === you?.userId} />
          ))}
        </tbody>
      </table>
      {board.entries.length === 0 && <p>{week ? t("Nobody has landed a fish this week. Be first.") : t("The board is blank. Land a fish.")}</p>}
      {you && you.rank > BOARD_LIMIT && (
        <p className="board-standing">
          {week
            ? tn(you.score, "Outside the posted hundred. You sit at #{rank} with {n} point this week.", "Outside the posted hundred. You sit at #{rank} with {n} points this week.", { rank: you.rank })
            : tn(you.score, "Outside the posted hundred. You sit at #{rank} with {n} lifetime point.", "Outside the posted hundred. You sit at #{rank} with {n} lifetime points.", { rank: you.rank })}
        </p>
      )}
      <section className="record-wall" aria-label={t("Species records")}>
        <h2>{t("Record wall")}</h2>
        <p>{t("The heaviest of each fish anyone at the lodge has landed.")}</p>
        {records && (
          <ul>
            {FISH.map((fish) => {
              const record = records.find((row) => row.speciesId === fish.id);
              return (
                <li key={fish.id} className={record ? `rarity-${fish.rarity}` : "empty"}>
                  {/* An empty slot keeps the species secret until someone at the lodge lands one. */}
                  {record && <FishMark species={fish} />}
                  <strong>{record ? t(fish.name) : t("Unknown")}</strong>
                  {record ? (
                    <span>
                      {weightText(record.weight)} · {record.holder}
                      {record.userId === you?.userId ? ` ${t("(you)")}` : ""}
                    </span>
                  ) : (
                    <span>{t("No one yet")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
