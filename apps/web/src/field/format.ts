import { SPOT_LABELS } from "@stillwater/shared";
import { getLang, locale, t, tn } from "../i18n";

/** Formatters per language, built on first use so a language change takes effect. */
const formats = new Map<string, Intl.DateTimeFormat>();

function format(name: "day" | "long" | "clock"): Intl.DateTimeFormat {
  const tag = locale();
  const key = `${tag}:${name}`;
  let found = formats.get(key);
  if (!found) {
    const options: Intl.DateTimeFormatOptions =
      name === "day"
        ? { weekday: "short", month: "short", day: "numeric" }
        : name === "long"
          ? { weekday: "long", month: "long", day: "numeric" }
          : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    found = new Intl.DateTimeFormat(tag, options);
    formats.set(key, found);
  }
  return found;
}

export function formatDay(ymd: string): string {
  return format("day").format(new Date(`${ymd}T12:00:00`));
}

/** The day a fish was caught, read from its full time so a UTC stamp lands on the local day. */
export function formatCatchDay(iso: string): string {
  return format("day").format(new Date(iso));
}

export function formatLongDay(date: Date): string {
  return format("long").format(date);
}

export function formatClock(iso: string): string {
  return format("clock").format(new Date(iso));
}

export function tripWhen(ymd: string, today: string, tomorrow: string): string {
  if (ymd === today) return t("Today");
  if (ymd === tomorrow) return t("Tomorrow");
  return formatDay(ymd);
}

export function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fishCountLabel(count: number): string {
  if (count === 0) return t("Nothing logged");
  return tn(count, "{n} fish", "{n} fish");
}

/**
 * A message from the shared rules or the stores, in the player's language.
 * Most are plain lines; the photo ceiling carries its number.
 */
export function messageText(message: string): string {
  const over = /^That photo is still over (\d+(?:\.\d+)?) KB after it is reduced, so it was not saved\.$/.exec(message);
  if (over) return t("That photo is still over {kb} KB after it is reduced, so it was not saved.", { kb: over[1] });
  return t(message);
}

/** Notes the lake writes on a landed fish ("Landed at the dock."), in the player's language; other notes stay as written. */
export function noteText(note: string): string {
  if (getLang() === "en") return note;
  if (note === "Landed on the lake.") return t("Landed on the lake.");
  const at = /^Landed at the (.+)\.$/.exec(note);
  if (at) {
    const label = Object.values(SPOT_LABELS).find((one) => one.toLowerCase() === at[1]);
    if (label) return t("Landed at the {spot}.", { spot: t(label) });
  }
  return note;
}
