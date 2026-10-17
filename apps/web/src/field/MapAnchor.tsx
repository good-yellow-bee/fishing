import type { ReactNode } from "react";
import { t, useT } from "../i18n";
import { osmLink } from "./osmLink";

/** A water's pin on OpenStreetMap, in a new tab; a screen reader hears that before following it. */
export function MapAnchor({ lat, lng, className, children }: { lat: number; lng: number; className?: string; children: ReactNode }) {
  useT();
  return (
    <a className={className} href={osmLink(lat, lng)} target="_blank" rel="noreferrer">
      {children}
      <span className="sr-only"> {t("(opens OpenStreetMap in a new tab)")}</span>
    </a>
  );
}
