import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { localDate, type Logbook } from "@stillwater/shared";
import { t, tn } from "../i18n";
import { bookFishDay } from "./tripMonths";
import { seasonRecap } from "./bests/seasonRecap";

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

/** False when storage refused it: a goal is only a nudge, so the book itself is untouched either way. */
export function writeYearGoals(goals: YearGoals): boolean {
  try {
    localStorage.setItem(YEAR_GOAL_KEY, JSON.stringify(goals));
    return true;
  } catch {
    return false;
  }
}

export function readYearGoal(year: string): number | null {
  return readYearGoals()[year] ?? null;
}

function saveYearGoal(year: string, goal: number | null): boolean {
  const next = { ...readYearGoals() };
  if (goal === null) delete next[year];
  else next[year] = goal;
  return writeYearGoals(next);
}

/**
 * How the year is going against its goal: the fish the year ends with at this rate, how many a week the rest
 * needs, and how far ahead of an even pace to the goal it is (behind when below 0). Null before a first fish, once the
 * goal is reached, and in the year's first fortnight, when a rate says little.
 */
export function goalPace(count: number, goal: number, now: Date): { pace: number; left: number; perWeek: number; daysLeft: number; ahead: number } | null {
  if (count === 0 || count >= goal) return null;
  const year = now.getFullYear();
  // Calendar days, counted in UTC so a clock change never makes a day of 23 or 25 hours.
  const DAY = 24 * 60 * 60 * 1000;
  const gone = Math.round((Date.UTC(year, now.getMonth(), now.getDate()) - Date.UTC(year, 0, 1)) / DAY) + 1;
  if (gone < 14) return null;
  const total = Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY);
  const daysLeft = total - gone + 1;
  const left = goal - count;
  return { pace: Math.round((count / gone) * total), left, perWeek: Math.ceil(left / Math.max(1, daysLeft / 7)), daysLeft, ahead: count - Math.round((goal * gone) / total) };
}

/** "/bests?goal=set": Bests with this year's goal form open, for a year that has none yet. */
export const GOAL_PARAM = "goal";

/** This year's fish against a goal the angler sets, or an offer to set one. */
/** `openAtStart` opens the form at once when the year has no goal yet, as Home's "Set a goal for {year}" promises. */
export function YearGoal({ book, now = new Date(), openAtStart = false }: { book: Logbook; now?: Date; openAtStart?: boolean }) {
  const year = String(now.getFullYear());
  const [goal, setGoal] = useState(() => readYearGoal(year));
  const [editing, setEditing] = useState(() => openAtStart && readYearGoal(year) === null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  // A goal taken off that storage wouldn't let go of: it is still there on the next visit, and says so.
  const [unsaved, setUnsaved] = useState(false);
  const errorId = useId();
  const countId = useId();
  // Set or taken off in another tab: shown here too, rather than this tab's older goal.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === YEAR_GOAL_KEY || event.key === null) setGoal(readYearGoal(year));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [year]);
  // Opened, the box takes focus and comes into view: after the page's own move to the top when Home's link opened it.
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing) return;
    input.current?.focus({ preventScroll: true });
    input.current?.scrollIntoView?.({ block: "center" });
  }, [editing]);
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
  // A night session's small hours count on its outing's day, as the calendar and days out do.
  const count = book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${year}-`)).length;
  // Last year's total, counted the same way: a place to start a goal from.
  const lastYear = String(Number(year) - 1);
  const lastYearCount = book.catches.filter((entry) => bookFishDay(book, entry).startsWith(`${lastYear}-`)).length;
  const hintId = useId();
  // Last year up to this same day, counted as this year's count is: where the year stood then.
  const lastYearByNow = lastYearCount > 0 ? seasonRecap(book, year, localDate(now)).fishBefore : 0;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    commit(draft);
  };
  const commit = (text: string) => {
    const value = Number(text.trim());
    if (!Number.isInteger(value) || value < 1 || value > 10000) {
      setError(t("Give the goal as a whole number of fish, from 1 to 10000."));
      return;
    }
    if (!saveYearGoal(year, value)) {
      setError(t("The goal could not be saved in this browser."));
      return;
    }
    setUnsaved(false);
    setGoal(value);
    setError("");
    close();
  };

  if (editing) {
    return (
      <form
        className="year-goal-form"
        onSubmit={onSubmit}
        // Escape puts the form away as its Cancel does, with focus back on the goal's button.
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          close();
        }}
      >
        <label>
          {t("Fish to catch in {year}", { year })}
          <input
            name="goal"
            inputMode="numeric"
            ref={input}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={[lastYearCount > 0 ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
          />
        </label>
        <button type="submit">{t("Save goal")}</button>
        <button type="button" className="text-button" onClick={close}>
          {t("Cancel")}
        </button>
        {lastYearCount > 0 ? (
          <p className="meta year-goal-hint" id={hintId}>
            {tn(lastYearCount, "Last year: {n} fish", "Last year: {n} fish")}
          </p>
        ) : null}
        {/* Most anglers set last year's number, or a little more: the one already on screen, saved in a tap. */}
        {lastYearCount > 0 ? (
          <p className="meta year-goal-same">
            <button type="button" className="text-button" onClick={() => commit(String(lastYearCount))}>
              {t("Same as last year ({n})", { n: lastYearCount })}
            </button>
          </p>
        ) : null}
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
        {unsaved ? (
          <span className="field-error" role="alert">
            {" "}
            {t("The goal could not be removed in this browser, so it comes back next time.")}
          </span>
        ) : null}
      </p>
    );
  }
  const pace = goalPace(count, goal, now);
  return (
    <div className="year-goal">
      <p>
        <span id={countId}>{count >= goal ? t("Goal reached: {count} of {goal} fish in {year}.", { count, goal, year }) : t("{count} of {goal} fish in {year}", { count, goal, year })}</span>{" "}
        {/* Focus comes back here after a save: the count it describes is what a screen reader hears with it. */}
        <button ref={back} type="button" className="text-button" onClick={open} aria-describedby={countId}>
          {t("Change goal")}
        </button>{" "}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setUnsaved(!saveYearGoal(year, null));
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
          {t("On pace for {pace} by the year's end", { pace: pace.pace })}
          {/* Against an even spread of the goal over the year, so far. */}
          {pace.ahead > 0 ? ` · ${tn(pace.ahead, "{n} fish ahead of pace", "{n} fish ahead of pace")}` : pace.ahead < 0 ? ` · ${tn(-pace.ahead, "{n} fish behind pace", "{n} fish behind pace")}` : ""} · {pace.daysLeft < 7
            ? tn(pace.daysLeft, "{left} to go, {n} day left", "{left} to go, {n} days left", { left: pace.left })
            : t("{left} to go, about {week} a week", { left: pace.left, week: pace.perWeek })}
        </p>
      ) : null}
      {/* Where last year stood on this day, once it had a fish by then. */}
      {lastYearByNow > 0 && count < goal ? <p className="meta goal-last-year">{t("{n} by this date last year", { n: lastYearByNow })}</p> : null}
    </div>
  );
}
