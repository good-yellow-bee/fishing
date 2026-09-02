import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BOARD_LIMIT, type BoardEntry, type BoardView } from "@stillwater/shared";
import { getBoard } from "../api";

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
      <td>{row.lifetimePoints}</td>
      <td>{row.heaviest > 0 ? `${row.heaviest.toFixed(1)} lb` : "—"}</td>
      <td>{row.species}</td>
    </tr>
  );
}

export function BoardPage() {
  const [board, setBoard] = useState<BoardView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBoard()
      .then(setBoard)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <div className="log-page">{error}</div>;
  if (!board) return <div className="log-page">Reading the lodge board…</div>;

  const you = board.you;

  return (
    <div className="log-page board-page">
      <p>
        <Link to="/">Back to the dock</Link>
        {" · "}
        <Link to="/log">Catch log</Link>
      </p>
      <h1>Lodge board</h1>
      <p>Top {BOARD_LIMIT} anglers by lifetime points. Heaviest fish breaks a tie.</p>
      {you && (
        <div className="log-summary">
          <div>
            <span className="eyebrow">Your place</span>
            <strong>#{you.rank}</strong>
          </div>
          <div>
            <span className="eyebrow">Lifetime</span>
            <strong>{you.lifetimePoints}</strong>
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
            <th>Lifetime</th>
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
      {board.entries.length === 0 && <p>The board is blank. Land a fish.</p>}
      {you && you.rank > BOARD_LIMIT && (
        <p className="board-standing">
          Outside the posted hundred. You sit at #{you.rank} with {you.lifetimePoints} lifetime points.
        </p>
      )}
    </div>
  );
}
