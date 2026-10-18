import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { badgeById, fishById, LAKE_HOUR_LABELS, localDate, SEASON_LABELS, skyLabel, SPOT_LABELS, streakDays } from "@stillwater/shared";
import { errorText, getMe, type Me } from "../api";
import { FieldGuide } from "../components/FieldGuide";
import { FishMark } from "../components/FishMark";
import { readStoredLogbook } from "../field/storage";
import { kindOnPage } from "../field/speciesLink";
import { locale, tn, useT } from "../i18n";
import { weightText } from "../i18n/content";
import { usePageTitle } from "../pageTitle";

export function LogPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  // The field log lives on this device; the guide links each kind it holds.
  const [book] = useState(readStoredLogbook);
  const t = useT();
  usePageTitle(`${me ? t("{name}’s catch log", { name: me.profile.displayName }) : t("Catch log")} · Stillwater`);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <main className="log-page">{errorText(error)}</main>;
  if (!me) return <main className="log-page">{t("Loading the log…")}</main>;

  const catches = me.catches;
  const totalWeight = catches.reduce((sum, row) => sum + row.weight, 0);
  const heaviest = catches.reduce<(typeof catches)[number] | null>(
    (best, row) => (!best || row.weight > best.weight ? row : best),
    null,
  );

  return (
    <main className="log-page">
      <p>
        <Link to="/play">{t("Back to the dock")}</Link>
        {" · "}
        <Link to="/board">{t("Lodge board")}</Link>
      </p>
      <h1 id="log-title">{t("{name}’s catch log", { name: me.profile.displayName })}</h1>
      <p>
        {tn(me.profile.lifetimePoints, "{n} lifetime points", "{n} lifetime points")} ·{" "}
        {tn(catches.length, "{n} recent fish", "{n} recent fish")}
      </p>
      <p className="log-streak">
        {t("Days in a row on the water: {current} now, {best} at best", {
          current: streakDays(me.recentDays, localDate(new Date())).current,
          best: me.longestStreak,
        })}
      </p>
      <section className="badge-wall" aria-label={t("Lodge badges")}>
        <h2>{t("Lodge badges")}</h2>
        <ul>
          {me.badges.map((badge) => {
            const info = badgeById(badge.id);
            return (
              <li key={badge.id} className={badge.earned ? "earned" : ""}>
                <strong>{info ? t(info.label) : badge.id}</strong>
                <span>{info ? t(info.blurb) : undefined}</span>
                <small>{badge.earned ? t("Earned") : t("{have} of {need}", { have: badge.have, need: badge.need })}</small>
              </li>
            );
          })}
        </ul>
      </section>
      <FieldGuide stats={me.speciesStats} inBook={(name) => (book ? kindOnPage(book, name).length : 0)} />
      {heaviest && (
        <div className="log-summary">
          <div>
            <span className="eyebrow">{t("Recent")}</span>
            <strong>{catches.length}</strong>
          </div>
          <div>
            <span className="eyebrow">{t("Total weight")}</span>
            <strong>{weightText(totalWeight)}</strong>
          </div>
          <div>
            <span className="eyebrow">{t("Heaviest")}</span>
            <strong>{weightText(heaviest.weight)}</strong>
            <small>{t(fishById(heaviest.speciesId)?.name ?? heaviest.speciesId)}</small>
          </div>
        </div>
      )}
      {/* On a phone the table scrolls sideways on its own, so it takes focus for the arrow keys and is named by the page title. */}
      <table tabIndex={0} aria-labelledby="log-title">
        <thead>
          <tr>
            <th>{t("Fish")}</th>
            <th>{t("Weight")}</th>
            <th>{t("Spot")}</th>
            <th>{t("Conditions")}</th>
            <th>{t("Points")}</th>
            <th>{t("When")}</th>
          </tr>
        </thead>
        <tbody>
          {catches.map((row) => {
            const species = fishById(row.speciesId);
            return (
              <tr key={row.id} className={row.id === heaviest?.id ? "heaviest" : ""}>
                <td className={species ? `rarity-${species.rarity}` : ""}>
                  <span className="log-fish">
                    {species && <FishMark species={species} golden={row.golden} />}
                    {species ? t(species.name) : row.speciesId}
                    {row.golden && <small className="log-golden">{t("Golden")}</small>}
                    {row.released && <small className="log-released">{t("Released")}</small>}
                  </span>
                </td>
                <td>{weightText(row.weight)}</td>
                <td>{t(SPOT_LABELS[row.spot])}</td>
                <td>
                  {row.hour && row.sky ? `${t(LAKE_HOUR_LABELS[row.hour])} · ${t(skyLabel(row.sky, row.season))}` : "—"}
                  {row.season && <small className="log-season">{t(SEASON_LABELS[row.season])}</small>}
                </td>
                <td>{row.points}</td>
                <td>{new Date(row.createdAt).toLocaleString(locale())}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {catches.length === 0 && <p>{t("Nothing landed yet.")}</p>}
    </main>
  );
}
