import { useEffect, useRef, useState } from "react";
import { localDate } from "@stillwater/shared";
import { ApiError, claimDailyRequest, errorText, getDailyRequests, type DailyBoard } from "../api";
import { t, useT } from "../i18n";
import { dailyRequestText } from "../i18n/content";

type Props = {
  /** Changes once a catch reaches the server, so progress reloads. */
  catchKey: string | undefined;
  onClaimed: () => Promise<unknown>;
};

export function DailyRequestsPanel({ catchKey, onClaimed }: Props) {
  useT();
  const [board, setBoard] = useState<DailyBoard | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  // Claims paid this session, by day: a board read before the claim landed must not offer them again.
  const settled = useRef(new Set<string>());
  // The local day last asked for; the board is stale once the clock passes it.
  const asked = useRef("");

  useEffect(() => {
    let live = true;
    asked.current = localDate(new Date());
    getDailyRequests(asked.current)
      .then((next) => {
        if (!live) return;
        setBoard({
          ...next,
          requests: next.requests.map((row) => (settled.current.has(`${next.day}:${row.id}`) ? { ...row, claimed: true } : row)),
        });
        setError("");
        setLoadFailed(false);
      })
      .catch((err: Error) => {
        if (!live) return;
        setError(errorText(err.message));
        setLoadFailed(true);
      });
    return () => {
      live = false;
    };
  }, [catchKey, reload]);

  // A shop left open past midnight, or a tab resumed the next day, reads the new day's board.
  useEffect(() => {
    if (!board) return;
    const stale = () => localDate(new Date()) !== asked.current;
    const recheck = () => {
      if (stale()) setReload((n) => n + 1);
    };
    // A board read just before midnight can arrive already out of date.
    if (stale()) {
      recheck();
      return;
    }
    const midnight = new Date();
    midnight.setHours(24, 0, 1, 0);
    const timer = window.setTimeout(recheck, midnight.getTime() - Date.now());
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [board]);

  const claim = async (day: string, id: string) => {
    setClaiming(id);
    setError("");
    try {
      await claimDailyRequest(id, day);
    } catch (err) {
      // Already paid, from another tab or a claim whose response was lost: settle the row instead.
      if (!(err instanceof ApiError && err.message === "request already claimed")) {
        setError(err instanceof Error ? errorText(err.message) : t("The request could not be claimed."));
        setClaiming(null);
        return;
      }
    }
    settled.current.add(`${day}:${id}`);
    // Ids repeat across days, so a claim only settles the board it was made on.
    setBoard((current) =>
      current && current.day === day
        ? { ...current, requests: current.requests.map((row) => (row.id === id ? { ...row, claimed: true } : row)) }
        : current,
    );
    try {
      await onClaimed();
    } catch {
      setError(t("Claimed, but your points could not be refreshed."));
    }
    setClaiming(null);
  };

  return (
    <section className="daily-requests">
      <div className="panel-heading">
        <span className="eyebrow">{t("Shack board")}</span>
        <h3>{t("Today's requests")}</h3>
      </div>
      {board ? (
        <ul>
          {board.requests.map((row) => (
            // A live row reads out "Claimed" once its button is replaced.
            <li key={row.id} data-claimed={row.claimed ? "1" : "0"} aria-live="polite">
              <span className="daily-request-label">{dailyRequestText(row)}</span>
              <span className="daily-request-progress" data-done={row.progress >= row.count ? "1" : "0"}>
                {row.progress}/{row.count}
              </span>
              <span className="daily-request-reward">{t("+{reward} pts", { reward: row.reward })}</span>
              {row.claimed ? (
                <span className="daily-request-claimed">{t("Claimed")}</span>
              ) : (
                <button
                  type="button"
                  aria-label={t("Claim {request}", { request: dailyRequestText(row) })}
                  disabled={row.progress < row.count || claiming !== null}
                  onClick={() => void claim(board.day, row.id)}
                >
                  {t("Claim")}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !error && <p className="daily-requests-note">{t("Reading the board…")}</p>
      )}
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      {loadFailed && (
        <button
          className="panel-btn"
          type="button"
          onClick={() => {
            setError("");
            setLoadFailed(false);
            setReload((count) => count + 1);
          }}
        >
          {t("Read the board again")}
        </button>
      )}
    </section>
  );
}
