import { useRef } from "react";
import type { SpotId } from "@stillwater/shared";
import { lureBlurb, smallLuresFirst, suitsBank, suitsNow, type LureConditions } from "../game/lureChoice";
import { useT } from "../i18n";

type Props = {
  choices: string[];
  value: string;
  spot: SpotId;
  /** The lake right now, to mark the lures the season, hour and weather favor; left out, only the bank is read. */
  now?: LureConditions;
  locked: boolean;
  onChange: (value: string) => void;
};

/** The picker's name for a lure, with what favors it: this bank, the lake right now, or both. */
function optionText(t: ReturnType<typeof useT>, lure: string, here: boolean, now: boolean) {
  if (here && now) return t("{lure} · good here and now", { lure: t(lure) });
  if (here) return t("{lure} · good here", { lure: t(lure) });
  if (now) return t("{lure} · good now", { lure: t(lure) });
  return t(lure);
}

export function LureChoice({ choices, value, spot, now, locked, onChange }: Props) {
  // Arrow keys and type-ahead change a closed select, so only a pointer pick hands focus back.
  const pointerPick = useRef(false);
  const t = useT();
  return (
    <label
      className="lure-choice"
      hidden={locked}
      data-lure-choice
      data-lure={value}
      data-lure-locked={locked ? "1" : "0"}
    >
      <span>{t("Lure")}</span>
      <select
        aria-label={t("Lure")}
        value={value}
        disabled={locked}
        onPointerDown={(event) => {
          event.stopPropagation();
          pointerPick.current = true;
        }}
        onKeyDown={() => {
          pointerPick.current = false;
        }}
        onChange={(event) => {
          onChange(event.target.value);
          // A focused select swallows Space, so hand it back to the cast.
          if (pointerPick.current) event.currentTarget.blur();
        }}
      >
        {smallLuresFirst(choices).map((label) => (
          <option key={label} value={label}>
            {optionText(t, label, suitsBank(label, spot), !!now && suitsNow(label, now))}
          </option>
        ))}
      </select>
      <small>{lureBlurb(value, spot)}</small>
      {suitsBank(value, spot) && <small className="lure-here">{t("This bank suits it: the bites come sooner.")}</small>}
      {now && suitsNow(value, now) && <small className="lure-here">{t("The season, hour and weather suit it: the bites come sooner.")}</small>}
    </label>
  );
}
