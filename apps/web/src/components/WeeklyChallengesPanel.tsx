import { useEffect, useState } from "react";
import { localDate } from "@stillwater/shared";
import { claimWeeklyChallenge, errorText, getWeeklyChallenges, type WeeklyBoard } from "../api";
import { t, useT } from "../i18n";
import { weeklyChallengeText } from "../i18n/content";

type Props = {
  /** Changes once a catch reaches the server, so progress reloads. */
  catchKey: string | undefined;
  onClaimed: () => Promise<unknown>;
};

/** The week's three goals on the shack board, under the day's requests. */
export function WeeklyChallengesPanel({ catchKey, onClaimed }: Props) {
  useT();
  const [board, setBoard] = useState<WeeklyBoard | null>(null);
  const [asked, setAsked] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const day = localDate(new Date());
    getWeeklyChallenges(day)
      .then((next) => {
        if (!live) return;
        setBoard(next);
        setAsked(day);
        setError("");
      })
      .catch((err: Error) => {
        if (live) setError(errorText(err.message));
      });
    return () => {
      live = false;
    };
  }, [catchKey]);

  const claim = async (id: string) => {
    if (claiming) return;
    setClaiming(id);
    setError("");
    try {
      await claimWeeklyChallenge(id, asked);
      setBoard((current) => current && { ...current, challenges: current.challenges.map((row) => (row.id === id ? { ...row, claimed: true } : row)) });
      await onClaimed();
    } catch (err) {
      setError(errorText((err as Error).message));
    }
    setClaiming(null);
  };

  return (
    <section className="daily-requests weekly-challenges">
      <div className="panel-heading">
        <span className="eyebrow">{t("Shack board")}</span>
        <h3>{t("This week's challenges")}</h3>
      </div>
      {board ? (
        <ul>
          {board.challenges.map((row) => (
            <li key={row.id} data-claimed={row.claimed ? "1" : "0"} aria-live="polite">
              <span className="daily-request-label">{weeklyChallengeText(row, board.weekFish)}</span>
              <span className="daily-request-progress" data-done={row.progress >= row.goal ? "1" : "0"}>
                {row.progress}/{row.goal}
              </span>
              <span className="daily-request-reward">{t("+{reward} pts", { reward: row.reward })}</span>
              {row.claimed ? (
                <span className="daily-request-claimed">{t("Claimed")}</span>
              ) : (
                <button
                  type="button"
                  aria-label={t("Claim {request}", { request: weeklyChallengeText(row, board.weekFish) })}
                  disabled={row.progress < row.goal}
                  aria-disabled={claiming !== null || undefined}
                  onClick={() => void claim(row.id)}
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
      {board && <p className="daily-requests-note">{t("Goals run Monday to Sunday.")}</p>}
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
