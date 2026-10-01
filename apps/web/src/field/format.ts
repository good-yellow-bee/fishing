const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const longDayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const clockFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDay(ymd: string): string {
  return dayFormat.format(new Date(`${ymd}T12:00:00`));
}

export function formatLongDay(date: Date): string {
  return longDayFormat.format(date);
}

export function formatClock(iso: string): string {
  return clockFormat.format(new Date(iso));
}

export function tripWhen(ymd: string, today: string, tomorrow: string): string {
  if (ymd === today) return "Today";
  if (ymd === tomorrow) return "Tomorrow";
  return formatDay(ymd);
}

export function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fishCountLabel(count: number): string {
  if (count === 0) return "Nothing logged";
  if (count === 1) return "1 fish";
  return `${count} fish`;
}
