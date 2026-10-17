import { useState } from "react";
import { markNewsSeen, newsDue, NEWS_ITEMS, readSeenNews } from "../game/whatsNew";
import { useT } from "../i18n";

/** The newest few: the whole list runs to many screens, and the button must stay in reach. */
const NEWS_SHOWN = 4;

/** A one-time card for returning anglers listing what changed on the lake since their last visit. */
export function WhatsNew({ caughtTotal, hidden }: { caughtTotal: number; hidden: boolean }) {
  const t = useT();
  // Decided once per visit, like the walkthrough.
  const [open, setOpen] = useState(() => newsDue(caughtTotal, readSeenNews()));
  if (!open || hidden) return null;
  return (
    <aside className="whats-new" data-camera-control aria-labelledby="whats-new-title">
      <h2 id="whats-new-title">{t("New on the lake")}</h2>
      <ul>
        {NEWS_ITEMS.slice(0, NEWS_SHOWN).map((item) => (
          <li key={item}>{t(item)}</li>
        ))}
      </ul>
      <button
        className="panel-btn"
        type="button"
        onClick={() => {
          markNewsSeen();
          setOpen(false);
        }}
      >
        {t("Got it")}
      </button>
    </aside>
  );
}
