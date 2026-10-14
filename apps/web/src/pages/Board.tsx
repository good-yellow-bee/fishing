import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BOARD_LIMIT, FISH, type BoardEntry, type BoardPeriod, type BoardView, type SpeciesRecord } from "@stillwater/shared";
import { getBoard, getSpeciesRecords } from "../api";
import { FishMark } from "../components/FishMark";

const PERIOD_LABEL: Record<BoardPeriod, string> = { all: "All time", week: "This week" };

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
      <td>{row.displayName}</td>
      <td>{row.level}</td>
      <td>{row.score}</td>
      <td>{row.heaviest > 0 ? `${row.heaviest.toFixed(1)} lb` : "—"}</td>
      <td>{row.species}</td>
    </tr>
  );
}

export function BoardPage() {
  const [period, setPeriod] = useState<BoardPeriod>("all");
  const [board, setBoard] = useState<BoardView | null>(null);
  const [records, setRecords] = useState<SpeciesRecord[] | null>(null);
  const [error, setError] = useState("");

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

  if (error) return <div className="log-page">{error}</div>;
  if (!board) return <div className="log-page">Reading the lodge board…</div>;

  const you = board.you;
  const week = board.period === "week";
  const points = week ? "This week" : "Lifetime";

  return (
    <div className="log-page board-page">
      <p>
        <Link to="/play">Back to the dock</Link>
        {" · "}
        <Link to="/log">Catch log</Link>
      </p>
      <h1>Lodge board</h1>
      <div className="board-tabs" role="tablist" aria-label="Board period">
        {(["all", "week"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={period === option}
            className={period === option ? "active" : ""}
            onClick={() => setPeriod(option)}
          >
            {PERIOD_LABEL[option]}
          </button>
        ))}
      </div>
      <p>
        {week
          ? `Top ${BOARD_LIMIT} anglers by points landed since Monday 00:00 UTC. Heaviest fish this week breaks a tie.`
          : `Top ${BOARD_LIMIT} anglers by lifetime points. Heaviest fish breaks a tie.`}
      </p>
      {you && (
        <div className="log-summary">
          <div>
            <span className="eyebrow">Your place</span>
            <strong>#{you.rank}</strong>
          </div>
          <div>
            <span className="eyebrow">{points}</span>
            <strong>{you.score}</strong>
          </div>
          <div>
            <span className="eyebrow">Heaviest</span>
            <strong>{you.heaviest > 0 ? `${you.heaviest.toFixed(1)} lb` : "—"}</strong>
            <small>
              {you.species} species · {you.catches} landed
            </small>
          </div>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Angler</th>
            <th>Level</th>
            <th>{points}</th>
            <th>Heaviest</th>
            <th>Species</th>
          </tr>
        </thead>
        <tbody>
          {board.entries.map((row) => (
            <BoardRow key={row.userId} row={row} you={row.userId === you?.userId} />
          ))}
        </tbody>
      </table>
      {board.entries.length === 0 && <p>{week ? "Nobody has landed a fish this week. Be first." : "The board is blank. Land a fish."}</p>}
      {you && you.rank > BOARD_LIMIT && (
        <p className="board-standing">
          Outside the posted hundred. You sit at #{you.rank} with {you.score} {week ? "points this week" : "lifetime points"}.
        </p>
      )}
      <section className="record-wall" aria-label="Species records">
        <h2>Record wall</h2>
        <p>The heaviest of each fish anyone at the lodge has landed.</p>
        {records && (
          <ul>
            {FISH.map((fish) => {
              const record = records.find((row) => row.speciesId === fish.id);
              return (
                <li key={fish.id} className={record ? `rarity-${fish.rarity}` : "empty"}>
                  {/* An empty slot keeps the species secret until someone at the lodge lands one. */}
                  {record && <FishMark species={fish} />}
                  <strong>{record ? fish.name : "Unknown"}</strong>
                  {record ? (
                    <span>
                      {record.weight.toFixed(1)} lb · {record.holder}
                      {record.userId === you?.userId ? " (you)" : ""}
                    </span>
                  ) : (
                    <span>No one yet</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
