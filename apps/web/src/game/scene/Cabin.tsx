import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LakeSeason } from "@stillwater/shared";
import { CABIN_AT, CABIN_OVERHANG as OVERHANG, CABIN_SCALE, CABIN_WALLS, CABIN_YAW, CHIMNEY, chimneyTop } from "./cabinLook";
import { mergePainted } from "./mergeParts";
import { SmokePlume, type SmokeHour } from "./SmokePlume";
import { toonRamp } from "./toon";

const LOGS = "#7a5434";
const DOOR = "#4a3020";
const STONE = "#86827c";
const TRIM = "#d9cdb0";
const ROOF = { spring: "#5b4338", summer: "#5b4338", fall: "#5b4338", winter: "#eef2f4" } as const;
const WINDOW_LIT = "#ffd27a";
const WINDOW_DARK = "#2c3438";

const { width: W, depth: D, height: H, roof: R } = CABIN_WALLS;
/** The two windows either side of the door on the front wall (+z). */
const WINDOWS = [-0.8, 0.8];

/** Walls, gables, door and chimney, in one painted shape facing +z. */
export function cabinShape() {
  const gable = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, R)]);
  const gables = new THREE.ExtrudeGeometry(gable, { depth: W, bevelEnabled: false });
  return mergePainted([
    { geometry: new THREE.BoxGeometry(W, H, D), position: [0, H / 2, 0], color: LOGS },
    // The triangle under the roof, run the cabin's width.
    { geometry: gables, position: [-W / 2, H, 0], rotation: [0, Math.PI / 2, 0], color: LOGS },
    { geometry: new THREE.BoxGeometry(0.5, 0.95, 0.06), position: [0, 0.48, D / 2 + 0.02], color: DOOR },
    ...WINDOWS.map((x) => ({ geometry: new THREE.BoxGeometry(0.6, 0.55, 0.05), position: [x, 0.95, D / 2 + 0.01] as const, color: TRIM })),
    { geometry: new THREE.BoxGeometry(0.36, CHIMNEY.top - H * 0.6, 0.36), position: [CHIMNEY.x, (CHIMNEY.top + H * 0.6) / 2, CHIMNEY.z], color: STONE },
  ]);
}

/** The two roof panels, pitched each way off the ridge, overhanging the walls a little. */
export function roofShape() {
  const run = D / 2 + OVERHANG;
  const slope = Math.atan2(R, D / 2);
  const length = run / Math.cos(slope);
  return mergePainted(
    [1, -1].map((side) => ({
      geometry: new THREE.BoxGeometry(W + OVERHANG * 2, 0.08, length),
      position: [0, H + R - (Math.tan(slope) * run) / 2 + 0.04, (side * run) / 2] as const,
      rotation: [side * slope, 0, 0] as const,
      color: "#ffffff",
    })),
  );
}

/** The window panes, drawn apart so they can glow. */
export function paneShape() {
  return mergePainted(WINDOWS.map((x) => ({ geometry: new THREE.BoxGeometry(0.48, 0.43, 0.05), position: [x, 0.95, D / 2 + 0.03] as const, color: "#ffffff" })));
}

/**
 * Someone's log cabin across the lake: snow on its roof in winter, its windows glowing from dusk
 * (`lit`), and smoke from its chimney when the stove is going (`smoking`).
 */
export function Cabin({ season, hour, lit, smoking, wind }: { season: LakeSeason; hour: SmokeHour; lit: boolean; smoking: boolean; wind: { x: number; z: number } }) {
  const shapes = useMemo(() => ({ body: cabinShape(), roof: roofShape(), panes: paneShape() }), []);
  const body = useMemo(() => new THREE.MeshToonMaterial({ color: "#ffffff", vertexColors: true, gradientMap: toonRamp() }), []);
  const roof = useMemo(() => new THREE.MeshToonMaterial({ color: ROOF.summer, gradientMap: toonRamp() }), []);
  const panes = useMemo(() => new THREE.MeshBasicMaterial({ color: WINDOW_DARK, toneMapped: false }), []);
  const top = useMemo(chimneyTop, []);
  useEffect(
    () => () => {
      [shapes.body, shapes.roof, shapes.panes, body, roof, panes].forEach((item) => item.dispose());
    },
    [shapes, body, roof, panes],
  );
  useEffect(() => {
    roof.color.set(ROOF[season]);
  }, [roof, season]);
  useEffect(() => {
    panes.color.set(lit ? WINDOW_LIT : WINDOW_DARK);
  }, [panes, lit]);
  return (
    <group name="cabin">
      <group position={[CABIN_AT.x, 0, CABIN_AT.z]} rotation={[0, CABIN_YAW, 0]} scale={CABIN_SCALE}>
        <mesh geometry={shapes.body} material={body} castShadow />
        <mesh geometry={shapes.roof} material={roof} castShadow />
        <mesh geometry={shapes.panes} material={panes} />
      </group>
      {smoking && (
        <group position={[top.x, top.y - 0.4, top.z]}>
          <SmokePlume hour={hour} wind={wind} scale={1.6} />
        </group>
      )}
    </group>
  );
}
