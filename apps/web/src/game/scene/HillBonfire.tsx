import { Campfire } from "./Campfire";
import { BONFIRE_SCALE, bonfirePoint } from "./bonfireSite";
import type { SmokeHour } from "./SmokePlume";

/** A bonfire on the far hills on fall evenings (bonfireSite.ts): the campfire drawn larger. */
export function HillBonfire({ hour, wind }: { hour: SmokeHour; wind: { x: number; z: number } }) {
  const at = bonfirePoint();
  return (
    <group name="hill-bonfire" position={[at.x, at.y, at.z]} scale={BONFIRE_SCALE}>
      <Campfire lit hour={hour} wind={wind} at={{ x: 0, z: 0 }} upright />
    </group>
  );
}
