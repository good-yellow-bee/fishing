import { useEffect } from "react";
import { Link } from "react-router-dom";
import { t, useT } from "../../i18n";
import { focusPageHeading } from "../pageFocus";

/** In place of the map when its code can't be fetched: offline, before the map was ever opened online. */
export function MapOffline() {
  useT();
  // Drawn after the page change has settled: its heading takes focus, as every other page's does.
  useEffect(() => focusPageHeading(), []);
  return (
    <div className="sheet">
      <h1 tabIndex={-1}>{t("Map")}</h1>
      <p className="lede">{t("The map needs a connection the first time it opens.")}</p>
      <button type="button" className="field-primary inline" onClick={() => window.location.reload()}>
        {t("Try again")}
      </button>
      {/* Waters list every place, offline too. */}
      <p className="meta">
        <Link to="/spots">{t("Your waters and their places are on Waters.")}</Link>
      </p>
    </div>
  );
}

/** While the map's code loads: the page's heading is there at once, and a screen reader hears that the map is coming. */
export function MapLoading() {
  useT();
  return (
    <div className="sheet">
      <h1>{t("Map")}</h1>
      <p className="lede" role="status">
        {t("Fog lifting…")}
      </p>
    </div>
  );
}
