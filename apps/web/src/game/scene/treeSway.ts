import * as THREE from "three";

/** The height, in metres above its foot, at which a tree's sway is the full amount below. */
export const SWAY_REF_HEIGHT = 5;
/** A calm day's breath of sway at that height, each way, in metres. */
const CALM_SWAY = 0.025;
/** Metres of lean at that height for each metre a second of the day's wind drift. */
const LEAN_PER_WIND = 3;
/** Turns of the sway's beat per metre along the bank, so neighbours move out of step. */
const PHASE_X = 0.13;
const PHASE_Z = 0.17;

/**
 * How far a point `height` metres up a shore tree standing at (x, z) is pushed sideways `time`
 * seconds in: the crown leans downwind, further the stronger the wind, and sways about that lean
 * on a beat that quickens as the wind gets up. The foot never moves and the push grows with the
 * square of the height, so the trunk bends rather than slides. Every part of one tree shares its
 * beat. The tree shader below does the same sum on the graphics card.
 */
export function treeSway(x: number, z: number, height: number, wind: { x: number; z: number }, time: number) {
  const up = Math.max(0, height) / SWAY_REF_HEIGHT;
  const k = up * up;
  const speed = Math.hypot(wind.x, wind.z);
  const dir = speed < 1e-4 ? { x: 1, z: 0 } : { x: wind.x / speed, z: wind.z / speed };
  const phase = x * PHASE_X + z * PHASE_Z;
  const amount = speed * LEAN_PER_WIND * 0.7 + (CALM_SWAY + speed * LEAN_PER_WIND * 0.4) * Math.sin(time * (0.7 + speed * 6) + phase);
  return { x: dir.x * amount * k, z: dir.z * amount * k };
}

/** The wind and clock every swaying tree reads; LakeWorld sets them each frame. */
export const swayUniforms = {
  uSwayTime: { value: 0 },
  uSwayWind: { value: new THREE.Vector2() },
};

const SWAY_GLSL = /* glsl */ `
#ifdef USE_INSTANCING
{
  vec3 swayFoot = instanceMatrix[3].xyz;
  float swayK = max(0.0, mvPosition.y - swayFoot.y) / ${SWAY_REF_HEIGHT.toFixed(1)};
  swayK *= swayK;
  float swaySpeed = length(uSwayWind);
  vec2 swayDir = swaySpeed < 1e-4 ? vec2(1.0, 0.0) : uSwayWind / swaySpeed;
  float swayPhase = swayFoot.x * ${PHASE_X.toFixed(2)} + swayFoot.z * ${PHASE_Z.toFixed(2)};
  float swayAmount = swaySpeed * ${LEAN_PER_WIND.toFixed(1)} * 0.7
    + (${CALM_SWAY.toFixed(3)} + swaySpeed * ${LEAN_PER_WIND.toFixed(1)} * 0.4) * sin(uSwayTime * (0.7 + swaySpeed * 6.0) + swayPhase);
  mvPosition.xz += swayDir * swayAmount * swayK;
}
#endif
mvPosition = modelViewMatrix * mvPosition;`;

const swaying = new Map<THREE.Material, { copy: THREE.Material; users: number }>();

/**
 * A copy of `material` whose vertices sway as `treeSway` says, after the instance has placed
 * them in the world; the instance's own origin is taken as the tree's foot. One copy per
 * material, shared by every batch that wears it, as the original is shared by other scenery
 * that must stay still. Let go of it with releaseSwayingMaterial.
 */
export function swayingMaterial(material: THREE.Material) {
  const known = swaying.get(material);
  if (known) {
    known.users += 1;
    return known.copy;
  }
  const copy = material.clone();
  copy.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, swayUniforms);
    shader.vertexShader = `uniform float uSwayTime;\nuniform vec2 uSwayWind;\n${shader.vertexShader.replace(
      "#include <project_vertex>",
      THREE.ShaderChunk.project_vertex.replace("mvPosition = modelViewMatrix * mvPosition;", SWAY_GLSL),
    )}`;
  };
  copy.customProgramCacheKey = () => "tree-sway";
  swaying.set(material, { copy, users: 1 });
  return copy;
}

/** Lets go of a copy from swayingMaterial; the last user disposes it. */
export function releaseSwayingMaterial(material: THREE.Material) {
  const known = swaying.get(material);
  if (!known) return;
  known.users -= 1;
  if (known.users > 0) return;
  swaying.delete(material);
  known.copy.dispose();
}
