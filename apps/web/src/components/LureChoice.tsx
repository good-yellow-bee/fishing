import { useRef } from "react";
import type { SpotId } from "@stillwater/shared";
import { lureBlurb, smallLuresFirst, suitsBank, suitsNow, type LureConditions } from "../game/lureChoice";
import { LURE_TIER_WORD, type LureTier } from "../game/lureSeasoning";
import { useT } from "../i18n";

type Props = {
  choices: string[];
  value: string;
  spot: SpotId;
  /** The lake right now, to mark the lures the season, hour and weather favor; left out, only the bank is read. */
  now?: LureConditions;
  /** A lure's tier from the fish the field log took on it; left out, no tiers show. */
  tierOf?: (lure: string) => LureTier | null;
  locked: boolean;
  onChange: (value: string) => void;
};

/** The picker's name for a lure, with what favors it: this bank, the lake right now, or both. */
function optionText(t: ReturnType<typeof useT>, lure: string, here: boolean, now: boolean, tier: LureTier | null) {
  const text = here && now ? t("{lure} · good here and now", { lure: t(lure) }) : here ? t("{lure} · good here", { lure: t(lure) }) : now ? t("{lure} · good now", { lure: t(lure) }) : t(lure);
  return tier ? `${text} · ${t(LURE_TIER_WORD[tier])}` : text;
}

export function LureChoice({ choices, value, spot, now, tierOf, locked, onChange }: Props) {
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
            {optionText(t, label, suitsBank(label, spot), !!now && suitsNow(label, now), tierOf?.(label) ?? null)}
          </option>
        ))}
      </select>
      <small>{lureBlurb(value, spot)}</small>
      {tierOf?.(value) === "lucky" && <small className="lure-lucky">{t("Lucky lure: its hook sets a little more solid")}</small>}
      {suitsBank(value, spot) && <small className="lure-here">{t("This bank suits it: the bites come sooner.")}</small>}
      {now && suitsNow(value, now) && <small className="lure-here">{t("The season, hour and weather suit it: the bites come sooner.")}</small>}
    </label>
  );
}
