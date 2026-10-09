import { useRef } from "react";
import type { SpotId } from "@stillwater/shared";
import { lureBlurb, smallLuresFirst } from "../game/lureChoice";

type Props = {
  choices: string[];
  value: string;
  spot: SpotId;
  locked: boolean;
  onChange: (value: string) => void;
};

export function LureChoice({ choices, value, spot, locked, onChange }: Props) {
  // Arrow keys and type-ahead change a closed select, so only a pointer pick hands focus back.
  const pointerPick = useRef(false);
  return (
    <label
      className="lure-choice"
      hidden={locked}
      data-lure-choice
      data-lure={value}
      data-lure-locked={locked ? "1" : "0"}
    >
      <span>Lure</span>
      <select
        aria-label="Lure"
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
            {label}
          </option>
        ))}
      </select>
      <small>{lureBlurb(value, spot)}</small>
    </label>
  );
}
