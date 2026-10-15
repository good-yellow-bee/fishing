import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  levelProgress,
  levelUnlock,
  type LevelProgress,
  anglerTitle,
  LAKE_HOUR_LABELS,
  SKILL_LABELS,
  SEASON_BLURB,
  SEASON_LABELS,
  MOON_LABELS,
  skyBlurb,
  skyLabel,
  type MoonName,
  type Wind,
  WIND_LABELS,
  type LakeHour,
  type LakeSeason,
  type Profile,
  type Sky,
} from "@stillwater/shared";
import { authClient } from "../auth-client";
import { updateSettings, useSettings } from "../game/settings";
import { tn, useT } from "../i18n";

type Props = {
  profile: Profile;
  hour: LakeHour;
  sky: Sky;
  season?: LakeSeason;
  onSettings?: () => void;
  /** Shown once the outing has a fish in it. */
  onPackUp?: () => void;
  /** Consecutive local days with a fish, counting today; shown from two. */
  streak?: number;
  /** Tonight's moon; the eyebrow names it when it is full or new. */
  moon?: MoonName;
  /** The day's wind, named in the sky chip's tooltip. */
  wind?: Wind;
};

export function Hud({ profile, hour, sky, season, onSettings, onPackUp, streak = 0, moon, wind }: Props) {
  const progress = levelProgress(profile.lifetimePoints);
  const level = progress.level;
  const { muted } = useSettings();
  const t = useT();
  const header = useRef<HTMLElement>(null);
  // Phones stack the scene's chips under the HUD, whose height changes as it wraps.
  useEffect(() => {
    const el = header.current;
    const page = el?.parentElement;
    if (!el || !page || typeof ResizeObserver === "undefined") return;
    const sync = () => page.style.setProperty("--hud-bottom", `${Math.ceil(el.offsetTop + el.offsetHeight)}px`);
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, []);
  return (
    <header ref={header} className="hud" data-points={profile.points} data-strength={profile.strength} data-accuracy={profile.accuracy} data-patience={profile.patience} data-hour={hour} data-sky={sky}>
      <div className="hud-brand">
        {/* The season rides in the eyebrow: one more chip wrapped the HUD on laptop widths. */}
        <span className="eyebrow" title={season ? t(SEASON_BLURB[season]) : undefined}>
          {season ? t("Northern lake · {season}", { season: t(SEASON_LABELS[season]) }) : t("Northern lake")}
          {(moon === "full" || moon === "new") && ` · ${t(MOON_LABELS[moon])}`}
        </span>
        <strong>Stillwater</strong>
        <div className="hud-user">
          <span>{profile.displayName}</span>
          <span className="hud-title">{t(anglerTitle(level))}</span>
          {streak >= 2 && <span className="hud-streak">{tn(streak, "{n} day in a row", "{n} days in a row")}</span>}
        </div>
      </div>
      <div className="hud-stats">
        <span className="hour-chip">{t(LAKE_HOUR_LABELS[hour])}</span>
        {/* Blurb in the tooltip only: inline, it wrapped the HUD over the stance chip on laptop widths. */}
        <span className="sky-chip" title={wind ? `${t(skyBlurb(sky, season))} ${t("Wind: {wind}.", { wind: t(WIND_LABELS[wind]) })}` : t(skyBlurb(sky, season))}>
          {t(skyLabel(sky, season))}
        </span>
        <LevelChip progress={progress} />
        <span className="points-chip">{tn(profile.points, "{n} point", "{n} points|hud")}</span>
        <span className="skill-chip">
          <small>{t(SKILL_LABELS.strength)}</small> {profile.strength}
        </span>
        <span className="skill-chip">
          <small>{t(SKILL_LABELS.accuracy)}</small> {profile.accuracy}
        </span>
        <span className="skill-chip">
          <small>{t(SKILL_LABELS.patience)}</small> {profile.patience}
        </span>
        <Link className="hud-link" to="/catches">{t("Field log|hud")}</Link>
        <Link className="hud-link" to="/log">{t("Catch log|hud")}</Link>
        <Link className="hud-link" to="/board">{t("Board")}</Link>
        <button
          className="hud-link"
          type="button"
          onClick={() => updateSettings({ muted: !muted })}
        >
          {muted ? t("Sound") : t("Mute")}
        </button>
        {onPackUp && (
          <button className="hud-link" type="button" onClick={onPackUp}>
            {t("Pack up")}
          </button>
        )}
        {onSettings && (
          <button className="hud-link" type="button" onClick={onSettings}>
            {t("Settings|hud")}
          </button>
        )}
        <button className="hud-link" type="button" onClick={() => authClient.signOut()}>
          {t("Logout")}
        </button>
      </div>
    </header>
  );
}

/** The level, with a fill along its foot for the way to the next one, which the tooltip names with what it opens. */
function LevelChip({ progress }: { progress: LevelProgress }) {
  const t = useT();
  const unlock = progress.next === null ? null : levelUnlock(progress.next);
  const way =
    progress.next === null
      ? t("Top level: {title}", { title: t(anglerTitle(progress.level)) })
      : `${tn(progress.toNext, "{n} point to level {level}", "{n} points to level {level}", { level: progress.next })}${unlock ? ` · ${t(unlock)}` : ""}`;
  return (
    <span className="level-chip" title={way} data-to-next={progress.toNext}>
      {t("Level {level}", { level: progress.level })}
      <span className="sr-only">{` · ${way}`}</span>
      <i className="level-fill" aria-hidden="true" style={{ width: `${Math.round(progress.share * 100)}%` }} />
    </span>
  );
}
