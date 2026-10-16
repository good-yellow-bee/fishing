import { waterTempTally, windTally, type Logbook, type WaterTempTally } from "@stillwater/shared";
import { t } from "../i18n";
import { tempText } from "../i18n/content";
import { exactTerm, findLink, findWithLink } from "./findLinks";
import { TallyBars } from "./TallyBars";

/** "Under 10°C", "10°C to 16°C", "21°C and up", in the player's units. */
export function tempBandLabel(row: WaterTempTally): string {
  if (row.from === null) return t("Under {temp}", { temp: tempText(row.to!) });
  if (row.to === null) return t("{temp} and up", { temp: tempText(row.from) });
  return t("{from} to {to}", { from: tempText(row.from), to: tempText(row.to) });
}

/**
 * The search for one band's fish. It is written in °F whatever the reader's units, because the bands' edges are whole
 * °F and a rounded °C edge (60°F is 15.6°C) would put a fish on the edge in the wrong band.
 */
export function tempBandSearch(row: WaterTempTally): string {
  const parts = [row.from === null ? null : `>${row.from}°F`, row.to === null ? null : `<${row.to}°F`].filter(Boolean);
  return parts.join(" + ");
}

/** The fish by wind and by water temperature, each once more than one row has fish; each row opens its fish in the search, within a kind when given. */
export function WeatherBars({ book, within }: { book: Logbook; within?: string }) {
  const winds = windTally(book);
  const temps = waterTempTally(book);
  const worth = (counts: number[]) => counts.filter((count) => count > 0).length > 1;
  const link = (text: string) => (within ? findWithLink(within, text) : findLink(text));
  return (
    <>
      {worth(winds.map((row) => row.count)) ? (
        <section>
          <div className="section-head">
            <h2>{t("By the wind")}</h2>
          </div>
          <TallyBars rows={winds.map((row) => ({ key: row.id, label: t(row.label), count: row.count, to: row.count > 0 ? link(exactTerm("wind", t(row.label))) : undefined }))} />
        </section>
      ) : null}
      {worth(temps.map((row) => row.count)) ? (
        <section>
          <div className="section-head">
            <h2>{t("By water temperature")}</h2>
          </div>
          <TallyBars rows={temps.map((row) => ({ key: String(row.from), label: tempBandLabel(row), count: row.count, to: row.count > 0 ? link(tempBandSearch(row)) : undefined }))} />
        </section>
      ) : null}
    </>
  );
}
