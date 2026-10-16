import { useId, useState, type FormEvent } from "react";
import type { CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { catchMonth } from "./tripMonths";

/** The angler's own target of fish for a year, kept in this browser by year. */
export const YEAR_GOAL_KEY = "stillwater.field-log.year-goal.v1";

export function readYearGoal(year: string): number | null {
  try {
    const goals = JSON.parse(localStorage.getItem(YEAR_GOAL_KEY) ?? "{}") as Record<string, unknown>;
    const goal = goals?.[year];
    return typeof goal === "number" && Number.isInteger(goal) && goal > 0 && goal <= 10000 ? goal : null;
  } catch {
    return null;
  }
}

function saveYearGoal(year: string, goal: number | null) {
  try {
    const goals = JSON.parse(localStorage.getItem(YEAR_GOAL_KEY) ?? "{}") as Record<string, number>;
    const next = typeof goals === "object" && goals !== null && !Array.isArray(goals) ? { ...goals } : {};
    if (goal === null) delete next[year];
    else next[year] = goal;
    localStorage.setItem(YEAR_GOAL_KEY, JSON.stringify(next));
  } catch {
    // A goal is only a nudge; the book itself is untouched.
  }
}

/** This year's fish against a goal the angler sets, or an offer to set one. */
export function YearGoal({ catches, now = new Date() }: { catches: readonly CatchEntry[]; now?: Date }) {
  const year = String(now.getFullYear());
  const [goal, setGoal] = useState(() => readYearGoal(year));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const errorId = useId();
  const count = catches.filter((entry) => catchMonth(entry).startsWith(`${year}-`)).length;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(draft.trim());
    if (!Number.isInteger(value) || value < 1 || value > 10000) {
      setError(t("Give the goal as a whole number of fish, from 1 to 10000."));
      return;
    }
    saveYearGoal(year, value);
    setGoal(value);
    setEditing(false);
    setError("");
  };

  if (editing) {
    return (
      <form className="year-goal-form" onSubmit={onSubmit}>
        <label>
          {t("Fish to catch in {year}", { year })}
          <input
            name="goal"
            inputMode="numeric"
            value={draft}
            autoFocus
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        <button type="submit">{t("Save goal")}</button>
        <button type="button" className="text-button" onClick={() => setEditing(false)}>
          {t("Cancel")}
        </button>
        {error ? (
          <p className="field-error" role="alert" id={errorId}>
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  const open = () => {
    setDraft(goal ? String(goal) : "");
    setEditing(true);
  };
  if (goal === null) {
    return (
      <p className="year-goal">
        <button type="button" className="text-button" onClick={open}>
          {t("Set a goal for {year}", { year })}
        </button>
      </p>
    );
  }
  return (
    <div className="year-goal">
      <p>
        {count >= goal ? t("Goal reached: {count} of {goal} fish in {year}.", { count, goal, year }) : t("{count} of {goal} fish in {year}", { count, goal, year })}{" "}
        <button type="button" className="text-button" onClick={open}>
          {t("Change goal")}
        </button>{" "}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            saveYearGoal(year, null);
            setGoal(null);
          }}
        >
          {t("Remove goal")}
        </button>
      </p>
      <span className="tally-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (count / goal) * 100)}%` }} />
      </span>
    </div>
  );
}
