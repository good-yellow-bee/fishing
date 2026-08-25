import { useState } from "react";
import { MashChallenge } from "./MashChallenge";
import { TimingChallenge } from "./TimingChallenge";
import { TensionChallenge } from "./TensionChallenge";

type Props = {
  mashClicks: number;
  mashMs: number;
  timingHits: number;
  timingZone: number;
  tensionFailMs: number;
  onSuccess: () => void;
  onFail: () => void;
};

type Stage = "tension" | "timing" | "mash";

export function SurgeChallenge(props: Props) {
  const [stage, setStage] = useState<Stage>("tension");
  return (
    <div>
      <p>Surge — {stage}</p>
      {stage === "tension" && (
        <TensionChallenge
          failMs={props.tensionFailMs}
          onSuccess={() => setStage("timing")}
          onFail={props.onFail}
        />
      )}
      {stage === "timing" && (
        <TimingChallenge
          hits={Math.max(2, props.timingHits)}
          zone={props.timingZone * 0.85}
          onSuccess={() => setStage("mash")}
          onFail={props.onFail}
        />
      )}
      {stage === "mash" && (
        <MashChallenge
          clicks={props.mashClicks}
          ms={props.mashMs}
          onSuccess={props.onSuccess}
          onFail={props.onFail}
        />
      )}
    </div>
  );
}
