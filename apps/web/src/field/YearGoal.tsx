import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { CatchEntry } from "@stillwater/shared";
import { t } from "../i18n";
import { catchMonth } from "./tripMonths";

/** The angler's own target of fish for a year, kept in this browser by year. */
export const YEAR_GOAL_KEY = "stillwater.field-log.year-goal.v1";

export type YearGoals = Record<string, number>;

/** The goals in `value` that make sense, by year: anything else is dropped, so a hand-edited file can't break the page. */
export function cleanYearGoals(value: unknown): YearGoals {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const goals: YearGoals = {};
  for (const [year, goal] of Object.entries(value)) {
    if (/^\d{4}$/.test(year) && typeof goal === "number" && Number.isInteger(goal) && goal > 0 && goal <= 10000) goals[year] = goal;
  }
  return goals;
}

export function readYearGoals(): YearGoals {
  try {
    return cleanYearGoals(JSON.parse(localStorage.getItem(YEAR_GOAL_KEY) ?? "{}"));
  } catch {
    return {};
  }
}

export function writeYearGoals(goals: YearGoals) {
  try {
    localStorage.setItem(YEAR_GOAL_KEY, JSON.stringify(goals));
  } catch {
    // A goal is only a nudge; the book itself is untouched.
  }
}

export function readYearGoal(year: string): number | null {
  return readYearGoals()[year] ?? null;
}

function saveYearGoal(year: string, goal: number | null) {
  const next = { ...readYearGoals() };
  if (goal === null) delete next[year];
  else next[year] = goal;
  writeYearGoals(next);
}

/**
 * How the year is going against its goal: the fish the year ends with at this rate, and how many a week the rest
 * needs. Null before a first fish, once the goal is reached, and in the year's first fortnight, when a rate says little.
 */
export function goalPace(count: number, goal: number, now: Date): { pace: number; left: number; perWeek: number } | null {
  if (count === 0 || count >= goal) return null;
  const year = now.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const DAY = 24 * 60 * 60 * 1000;
  const gone = Math.floor((now.getTime() - start) / DAY) + 1;
  if (gone < 14) return null;
  const total = Math.round((end - start) / DAY);
  const weeksLeft = Math.max(1, (total - gone + 1) / 7);
  const left = goal - count;
  return { pace: Math.round((count / gone) * total), left, perWeek: Math.ceil(left / weeksLeft) };
}

/** This year's fish against a goal the angler sets, or an offer to set one. */
export function YearGoal({ catches, now = new Date() }: { catches: readonly CatchEntry[]; now?: Date }) {
  const year = String(now.getFullYear());
  const [goal, setGoal] = useState(() => readYearGoal(year));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const errorId = useId();
  // The form and the buttons take each other's place, so focus is handed back to the goal's own button.
  const back = useRef<HTMLButtonElement>(null);
  const [refocus, setRefocus] = useState(false);
  useEffect(() => {
    if (refocus && !editing) {
      back.current?.focus();
      setRefocus(false);
    }
  }, [refocus, editing, goal]);
  const close = () => {
    setEditing(false);
    setRefocus(true);
  };
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
    setError("");
    close();
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
        <button type="button" className="text-button" onClick={close}>
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
        <button ref={back} type="button" className="text-button" onClick={open}>
          {t("Set a goal for {year}", { year })}
        </button>
      </p>
    );
  }
  const pace = goalPace(count, goal, now);
  return (
    <div className="year-goal">
      <p>
        {count >= goal ? t("Goal reached: {count} of {goal} fish in {year}.", { count, goal, year }) : t("{count} of {goal} fish in {year}", { count, goal, year })}{" "}
        <button ref={back} type="button" className="text-button" onClick={open}>
          {t("Change goal")}
        </button>{" "}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            saveYearGoal(year, null);
            setGoal(null);
            setRefocus(true);
          }}
        >
          {t("Remove goal")}
        </button>
      </p>
      <span className="tally-bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (count / goal) * 100)}%` }} />
      </span>
      {pace ? (
        <p className="meta goal-pace">
          {t("On pace for {pace} by the year's end", { pace: pace.pace })} · {t("{left} to go, about {week} a week", { left: pace.left, week: pace.perWeek })}
        </p>
      ) : null}
    </div>
  );
}
