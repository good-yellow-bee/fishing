import { forecast, hotBankForDay, lakeSeason, SPOT_LABELS, MOON_LABELS, moonName, moonPhase, skyBlurb, skyLabel } from "@stillwater/shared";
import { locale, t, useT } from "../i18n";
import { isTurnover, rainedYesterday } from "../game/logic";

function dayName(date: Date, index: number) {
  if (index === 0) return t("Today");
  if (index === 1) return t("Tomorrow");
  const name = date.toLocaleDateString(locale(), { weekday: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A full or new moon on that day's night (read at 22:00), worth chalking up; null otherwise. */
function nightMoon(date: Date) {
  const name = moonName(moonPhase(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 22)));
  return name === "full" || name === "new" ? name : null;
}

/** What the moon does to the bite that night, to chalk under its name. */
const MOON_TIPS = {
  full: "On a clear night a spinner or spoon flashes under it.",
  new: "Too dark to see: bites come slower after dark.",
} as const;

/** Rain muddies the water, and catfish and burbot hunt by scent in it and fight harder (rainHunterTireMul). */
const RAIN_TIP = "Catfish and burbot hunt by scent in the murk and fight harder.";

/** The last hour before an overcast day turns to rain, when the fish feed hard (preRainWaitMul). */
const PRE_RAIN_TIP = "The fish feed hard in the hour before the rain, from {hour}:00.";
/** The first clear hour after a foggy morning, when the fish move up to feed (fogLiftWaitMul). */
const FOG_LIFT_TIP = "The fish move up to feed as the fog burns off, from {hour}:00.";
/** A clear day after the rain, when the fish sulk deep till noon (postFrontWaitMul). */
const POST_FRONT_TIP = "Bright after the rain: the fish sulk deep till noon, but a slow jig or worm still draws them.";
/** The days the lake turns over in late fall (turnoverWaitMul). */
const TURNOVER_TIP = "The lake is turning over: slow bites, except in the inlet's fresh water.";

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
            <span className="forecast-sky">{t(skyLabel(day.sky, lakeSeason(day.date)))}</span>
            {day.turn && (
              <span className="forecast-turn">{t("Turns {sky} around {hour}:00", { sky: t(skyLabel(day.turn.to, lakeSeason(day.date))).toLowerCase(), hour: day.turn.hour })}</span>
            )}
            <small>{t(skyBlurb(day.sky, lakeSeason(day.date)))}</small>
            <span className="forecast-bank">{t("Biting best at the {bank}", { bank: t(SPOT_LABELS[hotBankForDay(day.date)]) })}</span>
            {day.turn?.to === "rain" && <span className="forecast-tip">{t(PRE_RAIN_TIP, { hour: day.turn.hour - 1 })}</span>}
            {day.turn?.to === "clear" && <span className="forecast-tip">{t(FOG_LIFT_TIP, { hour: day.turn.hour })}</span>}
            {day.sky === "clear" && rainedYesterday(day.date) && <span className="forecast-tip">{t(POST_FRONT_TIP)}</span>}
            {isTurnover(day.date) && <span className="forecast-tip">{t(TURNOVER_TIP)}</span>}
            {(day.sky === "rain" || day.turn?.to === "rain") && <span className="forecast-tip">{t(RAIN_TIP)}</span>}
            {nightMoon(day.date) && <span className="forecast-moon">{t(MOON_LABELS[nightMoon(day.date)!])}</span>}
            {nightMoon(day.date) && <span className="forecast-tip">{t(MOON_TIPS[nightMoon(day.date)!])}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
