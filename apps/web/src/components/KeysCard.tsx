import { useEffect, useRef } from "react";
import { useT } from "../i18n";

/** Every way to play from a keyboard or a controller: the key, the pad button, and what it does. */
export const KEY_ROWS = [
  { keys: "Space / click", pad: "A / RT", does: "Hold to charge a cast, then strike and reel" },
  { keys: "Mouse", pad: "Right stick", does: "Aim the cast" },
  { keys: "W A S D", pad: "Left stick", does: "Walk the shore" },
  { keys: "E", pad: "Y", does: "Open the shop at the shack" },
  { keys: "H", pad: "Back", does: "Photo mode: hide the panels" },
  { keys: "Escape", pad: "B", does: "Close a panel" },
  { keys: "?", pad: "", does: "Show this card" },
] as const;

export function KeysCard({ onClose }: { onClose: () => void }) {
  const t = useT();
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    return () => before?.focus();
  }, []);

  return (
    <div className="settings-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={panel} className="settings-panel keys-card" role="dialog" aria-modal="true" aria-labelledby="keys-title">
        <h2 id="keys-title">{t("Keys and buttons")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("Key")}</th>
              <th>{t("Controller")}</th>
              <th>{t("Does")}</th>
            </tr>
          </thead>
          <tbody>
            {KEY_ROWS.map((row) => (
              <tr key={row.keys}>
                <td>
                  <kbd>{t(row.keys)}</kbd>
                </td>
                <td>{row.pad && <kbd>{t(row.pad)}</kbd>}</td>
                <td>{t(row.does)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="settings-note">{t("On a touch screen, tap the water to aim and cast, and tap anywhere to strike.")}</p>
        <button className="panel-btn" type="button" onClick={onClose}>
          {t("Back to the lake")}
        </button>
      </section>
    </div>
  );
}
