import { useEffect, useRef } from "react";
import { updateSettings, useSettings, type Settings } from "../game/settings";
import { setLang, useLang, useT, type Lang } from "../i18n";
import { FLOAT_COLOURS, FLOAT_SWATCH_HEX, type FloatColour } from "../game/scene/floatColour";

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
            // Picking effects by hand stops them stepping down on their own.
            onChange={() => updateSettings({ [name]: option.value, ...(name === "particles" ? { autoEffects: false } : {}) } as Partial<Settings>)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Each language is named in its own words, so either reader can find theirs. */
const LANGUAGE_NAMES: Record<Lang, string> = { en: "English", pl: "Polski" };

function LanguageChoice() {
  const lang = useLang();
  const t = useT();
  return (
    <fieldset className="settings-choices">
      <legend>{t("Language")}</legend>
      {(Object.keys(LANGUAGE_NAMES) as Lang[]).map((value) => (
        <label key={value} lang={value}>
          <input type="radio" name="lang" checked={lang === value} onChange={() => setLang(value)} />
          {LANGUAGE_NAMES[value]}
        </label>
      ))}
    </fieldset>
  );
}

const FLOAT_COLOUR_NAMES: Record<FloatColour, string> = {
  blue: "Blue",
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  purple: "Purple",
};

/** A row of swatches for the float's body. */
function FloatColourChoice() {
  const current = useSettings().floatColour;
  const t = useT();
  return (
    <fieldset className="settings-choices">
      <legend>{t("Float colour")}</legend>
      {FLOAT_COLOURS.map((colour) => (
        <label key={colour} title={t(FLOAT_COLOUR_NAMES[colour])}>
          <input type="radio" name="floatColour" checked={current === colour} onChange={() => updateSettings({ floatColour: colour })} />
          <span className="settings-swatch" style={{ background: FLOAT_SWATCH_HEX[colour] }} aria-hidden="true" />
          {t(FLOAT_COLOUR_NAMES[colour])}
        </label>
      ))}
    </fieldset>
  );
}

/** Language, text size, sound, camera, effects and reel controls, remembered in this browser. */
/** `onPhoto`, when given, hides every panel for a clean screenshot (H does the same). */
export function SettingsPanel({ onClose, onPhoto, onKeys }: { onClose: () => void; onPhoto?: () => void; onKeys?: () => void }) {
  const current = useSettings();
  const t = useT();
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
        <h2 id="settings-title">{t("Settings")}</h2>
        <LanguageChoice />
        <label className="settings-volume">
          <span>{t("Volume")}</span>
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
        <label className="settings-volume">
          <span>{t("Nature sounds")}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={current.natureVolume}
            onChange={(event) => updateSettings({ natureVolume: Number(event.target.value) })}
          />
          <output>{Math.round(current.natureVolume * 100)}%</output>
        </label>
        <label className="settings-check">
          <input type="checkbox" checked={current.muted} onChange={(event) => updateSettings({ muted: event.target.checked })} />
          {t("Mute all sound")}
        </label>
        <Choices
          name="textSize"
          legend={t("Text size")}
          options={[
            { value: "normal", label: t("Normal") },
            { value: "large", label: t("Large") },
            { value: "larger", label: t("Larger") },
          ]}
        />
        <label className="settings-check">
          <input type="checkbox" checked={current.highContrast} onChange={(event) => updateSettings({ highContrast: event.target.checked })} />
          {t("High contrast (solid panels and brighter text)")}
        </label>
        <label className="settings-check">
          <input type="checkbox" checked={current.soundCaptions} onChange={(event) => updateSettings({ soundCaptions: event.target.checked })} />
          {t("Sound captions (words for thunder, loons, owls and other lake sounds)")}
        </label>
        <label className="settings-check">
          <input type="checkbox" checked={current.leftHanded} onChange={(event) => updateSettings({ leftHanded: event.target.checked })} />
          {t("Left-handed (strike button and cast meter on the left of a touch screen)")}
        </label>
        <label className="settings-check">
          <input type="checkbox" checked={current.walkStick} onChange={(event) => updateSettings({ walkStick: event.target.checked })} />
          {t("Walking stick (a thumb stick for walking on a touch screen)")}
        </label>
        <Choices
          name="reelMode"
          legend={t("Reeling")}
          options={[
            { value: "hold", label: t("Hold to reel") },
            { value: "toggle", label: t("Tap to start and stop") },
          ]}
        />
        <FloatColourChoice />
        <Choices
          name="shake"
          legend={t("Camera shake")}
          options={[
            { value: "full", label: t("Full") },
            { value: "soft", label: t("Soft") },
            { value: "off", label: t("Off") },
          ]}
        />
        <label className="settings-check">
          <input
            type="checkbox"
            checked={current.reduceMotion}
            onChange={(event) => updateSettings({ reduceMotion: event.target.checked })}
          />
          {t("Reduce motion (no shake, flashes or card animations)")}
        </label>
        <Choices
          name="particles"
          legend={t("Effects")}
          options={[
            { value: "full", label: t("Full") },
            { value: "lite", label: t("Lite") },
          ]}
        />
        <Choices
          name="sharpness"
          legend={t("Picture")}
          options={[
            { value: "sharp", label: t("Sharp") },
            { value: "fast", label: t("Fast") },
          ]}
        />
        <label className="settings-check">
          <input type="checkbox" checked={current.shadows} onChange={(event) => updateSettings({ shadows: event.target.checked })} />
          {t("Shadows")}
        </label>
        <p className="settings-note">{t("Picture and shadows change the next time you open the lake.")}</p>
        {onKeys && (
          <button className="panel-btn" type="button" data-keys-card onClick={onKeys}>
            {t("Keys and buttons (?)")}
          </button>
        )}
        {onPhoto && (
          <button className="panel-btn" type="button" data-photo-mode onClick={onPhoto}>
            {t("Photo mode (H): hide the panels")}
          </button>
        )}
        <button className="panel-btn" type="button" onClick={onClose}>
          {t("Back to the lake")}
        </button>
      </section>
    </div>
  );
}
