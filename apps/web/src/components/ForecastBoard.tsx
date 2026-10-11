import { forecast, SKY_BLURB, SKY_LABELS } from "@stillwater/shared";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayName(date: Date, index: number) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return WEEKDAYS[date.getDay()];
}

/** Chalked on the shack wall: the next three days' sky and which fish it brings out. */
export function ForecastBoard({ now = new Date() }: { now?: Date }) {
  return (
    <section className="forecast-board" aria-label="Three-day forecast">
      <div className="panel-heading">
        <span className="eyebrow">Chalk board</span>
        <h3>The next three days</h3>
      </div>
      <ul>
        {forecast(now).map((day, index) => (
          <li key={day.date.toDateString()} data-sky={day.sky}>
            <strong>{dayName(day.date, index)}</strong>
            <span className="forecast-sky">{SKY_LABELS[day.sky]}</span>
            <small>{SKY_BLURB[day.sky]}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
