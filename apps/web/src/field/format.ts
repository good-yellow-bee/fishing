import { SPOT_LABELS } from "@stillwater/shared";
import { getLang, locale, t, tn } from "../i18n";

/** Formatters per language, built on first use so a language change takes effect. */
const formats = new Map<string, { format(date: Date): string }>();

function format(name: "day" | "long" | "clock" | "time", withYear = false): { format(date: Date): string } {
  const tag = locale();
  const key = `${tag}:${name}:${withYear}`;
  let found = formats.get(key);
  if (!found) {
    const options: Intl.DateTimeFormatOptions =
      name === "day"
        ? { weekday: "short", month: "short", day: "numeric" }
        : name === "long"
          ? { weekday: "long", month: "long", day: "numeric" }
          : name === "time"
            ? { hour: "numeric", minute: "2-digit" }
            : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    const intl = new Intl.DateTimeFormat(tag, withYear ? { ...options, year: "numeric" } : options);
    // May has no short form in Polish, and the browser gives it as "1 maj"; a date says "1 maja".
    found = tag.startsWith("pl") ? { format: (date) => intl.format(date).replace(/(\d) maj\b/, "$1 maja") } : intl;
    formats.set(key, found);
  }
  return found;
}

/** A day outside this year carries its year, so an old fish or a far-off outing isn't read as this year's. */
function otherYear(date: Date): boolean {
  return date.getFullYear() !== new Date().getFullYear();
}

/**
 * An outing's name as shown: its title, or for one saved without a title its water's name (as a new outing from a
 * draft is named), else "Outing", so a line never opens on a comma.
 */
export function outingName(trip: { title: string; spotId: string }, spots: readonly { id: string; name: string }[] = []): string {
  return trip.title.trim() || spots.find((spot) => spot.id === trip.spotId)?.name.trim() || t("Outing");
}

/** The shown name of the outing with this id, or null when the book has none such. */
export function outingNameById(book: { trips: readonly { id: string; title: string; spotId: string }[]; spots: readonly { id: string; name: string }[] }, id: string): string | null {
  const trip = book.trips.find((each) => each.id === id);
  return trip ? outingName(trip, book.spots) : null;
}

export function formatDay(ymd: string): string {
  const date = new Date(`${ymd}T12:00:00`);
  return format("day", otherYear(date)).format(date);
}

/** The day a fish was caught, read from its full time so a UTC stamp lands on the local day. */
export function formatCatchDay(iso: string): string {
  const date = new Date(iso);
  return format("day", otherYear(date)).format(date);
}

/** A day that always carries its year, for text read later elsewhere. */
export function formatDatedDay(date: Date): string {
  return format("day", true).format(date);
}

export function formatLongDay(date: Date): string {
  return format("long").format(date);
}

/** Just the time of day, for spans within one outing. */
export function formatTimeOfDay(iso: string): string {
  return format("time").format(new Date(iso));
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  return format("clock", otherYear(date)).format(date);
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
