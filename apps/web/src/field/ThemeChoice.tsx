import { t, useT } from "../i18n";
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
    </div>
  );
}
