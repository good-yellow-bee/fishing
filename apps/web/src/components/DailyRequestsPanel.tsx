import { useEffect, useState } from "react";
import { dailyRequestLabel } from "@stillwater/shared";
import { claimDailyRequest, getDailyRequests, type DailyBoard } from "../api";

type Props = {
  /** Changes once a catch reaches the server, so progress reloads. */
  catchKey: string | undefined;
  onClaimed: () => Promise<unknown>;
};

export function DailyRequestsPanel({ catchKey, onClaimed }: Props) {
  const [board, setBoard] = useState<DailyBoard | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getDailyRequests()
      .then((next) => {
        if (live) setBoard(next);
      })
      .catch((err: Error) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [catchKey]);

  const claim = async (day: string, id: string) => {
    setClaiming(id);
    setError("");
    try {
      await claimDailyRequest(id, day);
      setBoard((current) =>
        current && { ...current, requests: current.requests.map((row) => (row.id === id ? { ...row, claimed: true } : row)) },
      );
      await onClaimed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request could not be claimed.");
    } finally {
      setClaiming(null);
    }
  };

  return (
    <section className="daily-requests">
      <div className="panel-heading">
        <span className="eyebrow">Shack board</span>
        <h3>Today's requests</h3>
      </div>
      {board ? (
        <ul>
          {board.requests.map((row) => (
            <li key={row.id} data-claimed={row.claimed ? "1" : "0"}>
              <span className="daily-request-label">{dailyRequestLabel(row)}</span>
              <span className="daily-request-progress" data-done={row.progress >= row.count ? "1" : "0"}>
                {row.progress}/{row.count}
              </span>
              <span className="daily-request-reward">+{row.reward} pts</span>
              {row.claimed ? (
                <span className="daily-request-claimed">Claimed</span>
              ) : (
                <button
                  type="button"
                  disabled={row.progress < row.count || claiming !== null}
                  onClick={() => void claim(board.day, row.id)}
                >
                  Claim
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !error && <p className="daily-requests-note">Reading the board…</p>
      )}
      {error && <p className="warn">{error}</p>}
    </section>
  );
}
