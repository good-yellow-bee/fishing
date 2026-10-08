import { lureBlurb, smallLuresFirst } from "../game/lureChoice";

type Props = {
  choices: string[];
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
};

export function LureChoice({ choices, value, locked, onChange }: Props) {
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
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          onChange(event.target.value);
          // A focused select swallows Space, so hand it back to the cast.
          event.currentTarget.blur();
        }}
      >
        {smallLuresFirst(choices).map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
      <small>{lureBlurb(value)}</small>
    </label>
  );
}
