import { useRef, type KeyboardEvent } from "react";

/**
 * A row of buttons that acts as one radio group: a single tab stop on the chosen button,
 * and the arrow keys (plus Home and End) move the choice along the row.
 */
export function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
  wrap = false,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ id: T; label: string; lang?: string }>;
  onChange: (id: T) => void;
  wrap?: boolean;
}) {
  const row = useRef<HTMLDivElement>(null);
  const pick = (index: number) => {
    const next = options[(index + options.length) % options.length]!;
    onChange(next.id);
    row.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[options.indexOf(next)]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const at = options.findIndex((option) => option.id === value);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step !== undefined) pick(at + step);
    else if (event.key === "Home") pick(0);
    else if (event.key === "End") pick(options.length - 1);
    else return;
    event.preventDefault();
  };
  return (
    <div ref={row} className={wrap ? "choice-row wrap" : "choice-row"} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          tabIndex={value === option.id ? 0 : -1}
          className={value === option.id ? "on" : ""}
          lang={option.lang}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
