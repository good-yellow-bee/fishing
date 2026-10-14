import { useEffect, useRef } from "react";
import { updateSettings, useSettings, type Settings } from "../game/settings";

type Choice<K extends keyof Settings> = { value: Settings[K]; label: string };

function Choices<K extends keyof Settings>({ name, legend, options }: { name: K; legend: string; options: Choice<K>[] }) {
  const current = useSettings()[name];
  return (
    <fieldset className="settings-choices">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={String(option.value)}>
          <input
            type="radio"
            name={name}
            checked={current === option.value}
            onChange={() => updateSettings({ [name]: option.value } as Partial<Settings>)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Sound, camera, effects and reel controls, remembered in this browser. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const current = useSettings();
  const panel = useRef<HTMLElement>(null);

  // Focus moves in on open and back to the gear on close.
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => before?.focus();
  }, []);

  return (
    <div className="settings-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={panel} className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>
        <label className="settings-volume">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={current.volume}
            onChange={(event) => updateSettings({ volume: Number(event.target.value) })}
          />
          <output>{Math.round(current.volume * 100)}%</output>
        </label>
        <label className="settings-check">
          <input type="checkbox" checked={current.muted} onChange={(event) => updateSettings({ muted: event.target.checked })} />
          Mute all sound
        </label>
        <Choices
          name="reelMode"
          legend="Reeling"
          options={[
            { value: "hold", label: "Hold to reel" },
            { value: "toggle", label: "Tap to start and stop" },
          ]}
        />
        <Choices
          name="shake"
          legend="Camera shake"
          options={[
            { value: "full", label: "Full" },
            { value: "soft", label: "Soft" },
            { value: "off", label: "Off" },
          ]}
        />
        <label className="settings-check">
          <input
            type="checkbox"
            checked={current.reduceMotion}
            onChange={(event) => updateSettings({ reduceMotion: event.target.checked })}
          />
          Reduce motion (no shake, flashes or card animations)
        </label>
        <Choices
          name="particles"
          legend="Effects"
          options={[
            { value: "full", label: "Full" },
            { value: "lite", label: "Lite" },
          ]}
        />
        <Choices
          name="sharpness"
          legend="Picture"
          options={[
            { value: "sharp", label: "Sharp" },
            { value: "fast", label: "Fast" },
          ]}
        />
        <label className="settings-check">
          <input type="checkbox" checked={current.shadows} onChange={(event) => updateSettings({ shadows: event.target.checked })} />
          Shadows
        </label>
        <p className="settings-note">Picture and shadows change the next time you open the lake.</p>
        <button className="panel-btn" type="button" onClick={onClose}>
          Back to the lake
        </button>
      </section>
    </div>
  );
}
