import { useState } from "react";
import type { Logbook } from "@stillwater/shared";
import { getUnits, num, t, type Units } from "../i18n";
import { nearestWater } from "./spotOrder";

/** "1.2 km" or "0.7 mi", in the player's units. */
export function distanceText(km: number, units: Units): string {
  const value = units === "metric" ? km : km / 1.609344;
  return `${num(value, value < 10 ? 1 : 0)} ${units === "metric" ? "km" : "mi"}`;
}

/** Whether this browser can say where the player stands, and the book has a pinned water to measure to. */
export function canFindNearest(book: Logbook): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator && book.spots.some((spot) => spot.place);
}

/** Farther than this, the nearest pinned water isn't the one the player stands at, and nothing is picked. */
export const NEAR_KM = 3;

/** At the water with the phone: "Nearest water to me" picks the pinned water nearest to where the player stands. */
export function NearestWater({ book, onPick }: { book: Logbook; onPick: (spotId: string) => void }) {
  const [locating, setLocating] = useState<"idle" | "busy" | "failed" | { name: string; km: number; far: boolean }>("idle");
  const findNearest = () => {
    if (locating === "busy") return;
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const found = nearestWater(book, { lat: position.coords.latitude, lng: position.coords.longitude });
        if (!found) {
          setLocating("failed");
          return;
        }
        // At a new water, a pinned one 180 km off would take the form's water and its outing with it: only one close by.
        const far = found.km > NEAR_KM;
        if (!far) onPick(found.spot.id);
        setLocating({ name: found.spot.name, km: found.km, far });
      },
      () => setLocating("failed"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  return (
    <span className="field-hint nearest-water">
      <button type="button" className="text-button" aria-disabled={locating === "busy" ? true : undefined} onClick={findNearest}>
        {locating === "busy" ? t("Finding you…") : t("Nearest water to me")}
      </button>
      <span role="status">
        {locating === "failed"
          ? ` ${t("The browser didn't give a place.")}`
          : typeof locating === "object"
            ? // Standing on it: a distance that rounds to nothing reads as "here".
              ` ${
                locating.far
                  ? t("No pinned water is close by; the nearest is {water}, {distance} away.", { water: locating.name, distance: distanceText(locating.km, getUnits()) })
                  : locating.km < 0.1
                    ? t("{water}, right here.", { water: locating.name })
                    : t("{water}, {distance} away.", { water: locating.name, distance: distanceText(locating.km, getUnits()) })
              }`
            : ""}
      </span>
    </span>
  );
}
