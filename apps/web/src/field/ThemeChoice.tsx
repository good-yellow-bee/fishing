import { setLang, setUnits, t, useLang, useT, useUnits, type Lang, type Units } from "../i18n";
import { ChoiceRow } from "./ChoiceRow";
import { useFieldTheme, writeFieldTheme, type FieldTheme } from "./fieldTheme";

/** Light or dark pages for the field log, or whatever the device is set to. */
export function ThemeChoice() {
  useT();
  const theme = useFieldTheme();
  const options: ReadonlyArray<{ id: FieldTheme; label: string }> = [
    { id: "device", label: t("As the device") },
    { id: "light", label: t("Light") },
    { id: "dark", label: t("Dark") },
  ];
  return (
    <div className="theme-choice">
      <h2 className="subhead">
        {t("Page colours")}
      </h2>
      <ChoiceRow label={t("Page colours")} value={theme} options={options} onChange={writeFieldTheme} wrap />
      <ReadingChoice />
    </div>
  );
}

/** Each language in its own words, so either reader can find theirs. */
const LANGUAGES: ReadonlyArray<{ id: Lang; label: string; lang: string }> = [
  { id: "en", label: "English", lang: "en" },
  { id: "pl", label: "Polski", lang: "pl" },
];

const UNITS: ReadonlyArray<{ id: Units; label: string }> = [
  { id: "imperial", label: "lb · in · °F" },
  { id: "metric", label: "kg · cm · °C" },
];

/** The language and the units, here too, so the field log can be set without opening the game's settings. */
function ReadingChoice() {
  useT();
  const lang = useLang();
  const units = useUnits();
  return (
    <>
      <h2 className="subhead">{t("Language")}</h2>
      <ChoiceRow label={t("Language")} value={lang} options={LANGUAGES} onChange={setLang} wrap />
      <h2 className="subhead">{t("Units")}</h2>
      <ChoiceRow label={t("Units")} value={units} options={UNITS} onChange={setUnits} wrap />
    </>
  );
}
