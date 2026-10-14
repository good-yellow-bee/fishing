import { useT } from "../../i18n";
import { sweetBand } from "../logic";
import type { ScenePhase } from "./types";

type Props = {
  phase: ScenePhase;
  power: number;
  accuracy: number;
};

export function PowerMeter({ phase, power, accuracy }: Props) {
  const t = useT();
  if (phase !== "idle" && phase !== "casting") return null;
  const band = sweetBand(accuracy);
  return (
    <div className="power-meter" aria-hidden>
      <span>{t("Cast")}</span>
      <div className="bar">
        <div className="zone" style={{ left: `${band.min * 100}%`, width: `${(band.max - band.min) * 100}%` }} />
        <div className="marker" style={{ left: `${power * 100}%` }} />
      </div>
    </div>
  );
}
