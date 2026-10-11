import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { sessionSummary, sessionTitle, type SessionDraft } from "../game/session";

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
  const panel = useRef<HTMLElement>(null);
  const summary = sessionSummary(draft);

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    return () => before?.focus();
  }, []);

  return (
    <div className="settings-overlay trip-recap-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={panel} className="settings-panel trip-recap" role="dialog" aria-modal="true" aria-labelledby="trip-recap-title" tabIndex={-1}>
        <span className="eyebrow">{leftover ? "Your last trip" : "Packing up"}</span>
        <h2 id="trip-recap-title">{sessionTitle(draft)}</h2>
        <dl className="trip-recap-stats">
          <div>
            <dt>Fish</dt>
            <dd>{summary.count}</dd>
          </div>
          <div>
            <dt>Heaviest</dt>
            <dd>{summary.heaviest ? `${summary.heaviest.weight.toFixed(1)} lb` : "—"}</dd>
            {summary.heaviest && <small>{summary.heaviest.speciesName}</small>}
          </div>
          <div>
            <dt>Clean fights</dt>
            <dd>{summary.clean}</dd>
          </div>
        </dl>
        {summary.firsts.length > 0 && (
          <p className="trip-recap-firsts">New in the guide: {summary.firsts.map((fish) => fish.speciesName).join(", ")}</p>
        )}
        {filed ? (
          <>
            <p className="trip-recap-filed" role="status">
              Written in the book as “{filed.title}”. <Link to={`/trips/${filed.id}`}>Open the trip</Link>
            </p>
            <button className="panel-btn" type="button" onClick={onClose}>
              Back to the lake
            </button>
          </>
        ) : (
          <div className="trip-recap-actions">
            <button className="panel-btn primary" type="button" onClick={onFile}>
              Write it in the book
            </button>
            <button className="panel-btn" type="button" onClick={onClose}>
              {leftover ? "Let it go" : "Keep fishing"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
