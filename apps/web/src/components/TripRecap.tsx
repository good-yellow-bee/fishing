import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { sessionSummary, sessionTitle, type SessionDraft } from "../game/session";
import { useT } from "../i18n";
import { weightText } from "../i18n/content";
import { useTabWrap } from "./tabWrap";

type Props = {
  draft: SessionDraft;
  /** A trip left over from an earlier day, offered when the dock opens. */
  leftover: boolean;
  /** Set once the trip is in the field log. */
  filed: { id: string; title: string } | null;
  onFile: () => void;
  onClose: () => void;
};

/** The day on the water in one card, with the button that writes it into the field log as a trip. */
export function TripRecap({ draft, leftover, filed, onFile, onClose }: Props) {
  const t = useT();
  const panel = useRef<HTMLElement>(null);
  useTabWrap(panel);
  const summary = sessionSummary(draft);

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    return () => before?.focus();
  }, []);

  // Escape steps back to the lake like the other panels, but never lets an old trip go: that stays a button press.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (!leftover || filed)) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [leftover, filed, onClose]);

  return (
    <div className="settings-overlay trip-recap-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={panel} className="settings-panel trip-recap" role="dialog" aria-modal="true" aria-labelledby="trip-recap-title" tabIndex={-1}>
        <span className="eyebrow">{leftover ? t("Your last trip") : t("Packing up")}</span>
        <h2 id="trip-recap-title">{sessionTitle(draft)}</h2>
        <dl className="trip-recap-stats">
          <div>
            <dt>{t("Fish")}</dt>
            <dd>{summary.count}</dd>
          </div>
          <div>
            <dt>{t("Heaviest")}</dt>
            <dd>{summary.heaviest ? weightText(summary.heaviest.weight) : "—"}</dd>
            {summary.heaviest && <small>{t(summary.heaviest.speciesName)}</small>}
          </div>
          <div>
            <dt>{t("Clean fights")}</dt>
            <dd>{summary.clean}</dd>
          </div>
        </dl>
        {summary.firsts.length > 0 && (
          <p className="trip-recap-firsts">{t("New in the guide: {fish}", { fish: summary.firsts.map((fish) => t(fish.speciesName)).join(", ") })}</p>
        )}
        {filed ? (
          <>
            <p className="trip-recap-filed" role="status">
              {t("Written in the book as “{title}”.", { title: filed.title })} <Link to={`/trips/${filed.id}`}>{t("Open the trip")}</Link>
            </p>
            <button className="panel-btn" type="button" onClick={onClose}>
              {t("Back to the lake")}
            </button>
          </>
        ) : (
          <div className="trip-recap-actions">
            <button className="panel-btn primary" type="button" onClick={onFile}>
              {t("Write it in the book")}
            </button>
            <button className="panel-btn" type="button" onClick={onClose}>
              {leftover ? t("Let it go") : t("Keep fishing")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
