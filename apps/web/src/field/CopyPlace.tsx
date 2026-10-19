import { useState } from "react";
import { t } from "../i18n";

/** "Copy the place": a water's latitude and longitude, as a sounder, a chat or a car's navigation takes them. */
/** `name`: the water, said to a screen reader when a list has a button like this on every row. */
export function CopyPlace({ lat, lng, name }: { lat: number; lng: number; name?: string }) {
  const [said, setSaid] = useState("");
  const place = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const copy = async () => {
    // Emptied first, so a second copy is announced again.
    setSaid("");
    let message: string;
    try {
      await navigator.clipboard.writeText(place);
      message = t("Place copied.");
    } catch {
      message = t("This browser won't copy; the place is {place}.", { place });
    }
    setTimeout(() => setSaid(message), 100);
  };
  return (
    <>
      <button type="button" className="text-button copy-place" onClick={() => void copy()}>
        {t("Copy the place")}
        {name ? <span className="sr-only">: {name}</span> : null}
      </button>
      <span role="status" className="copy-place-said">
        {said ? ` ${said}` : ""}
      </span>
    </>
  );
}
