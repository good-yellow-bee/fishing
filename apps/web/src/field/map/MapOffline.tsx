import { t, useT } from "../../i18n";

/** In place of the map when its code can't be fetched: offline, before the map was ever opened online. */
export function MapOffline() {
  useT();
  return (
    <div className="sheet">
      <h1>{t("Map")}</h1>
      <p className="lede">{t("The map needs a connection the first time it opens.")}</p>
      <button type="button" className="field-primary inline" onClick={() => window.location.reload()}>
        {t("Try again")}
      </button>
    </div>
  );
}
