import { forecast, SKY_BLURB, SKY_LABELS } from "@stillwater/shared";
import { locale, t, useT } from "../i18n";

function dayName(date: Date, index: number) {
  if (index === 0) return t("Today");
  if (index === 1) return t("Tomorrow");
  const name = date.toLocaleDateString(locale(), { weekday: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Chalked on the shack wall: the next three days' sky and which fish it brings out. */
export function ForecastBoard({ now = new Date() }: { now?: Date }) {
  useT();
  return (
    <section className="forecast-board" aria-label={t("Three-day forecast")}>
      <div className="panel-heading">
        <span className="eyebrow">{t("Chalk board")}</span>
        <h3>{t("The next three days")}</h3>
      </div>
      <ul>
        {forecast(now).map((day, index) => (
          <li key={day.date.toDateString()} data-sky={day.sky}>
            <strong>{dayName(day.date, index)}</strong>
            <span className="forecast-sky">{t(SKY_LABELS[day.sky])}</span>
            {day.turn && (
              <span className="forecast-turn">{t("Turns {sky} around {hour}:00", { sky: t(SKY_LABELS[day.turn.to]).toLowerCase(), hour: day.turn.hour })}</span>
            )}
            <small>{t(SKY_BLURB[day.sky])}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
