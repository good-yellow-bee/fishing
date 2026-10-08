// @vitest-environment jsdom
import { act, Suspense, use } from "react";
import { advance, createRoot, useFrame, type ReconcilerRoot } from "@react-three/fiber";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Builds the scene graph without WebGL; nothing is ever drawn.
const gl = { render() {}, setPixelRatio() {}, setSize() {} };

let root: ReconcilerRoot<HTMLCanvasElement> | null = null;

/** Mirrors Scene: the angler suspends on its model, then writes rodTip each frame for the line to start from. */
async function lineStarts(anglerFirst: boolean) {
  const rodTip = new THREE.Vector3();
  const starts: number[] = [];
  let loadModel = () => {};
  const model = new Promise<void>((resolve) => {
    loadModel = resolve;
  });
  function Angler() {
    use(model);
    useFrame(() => {
      rodTip.x += 1;
    });
    return null;
  }
  function Line() {
    useFrame(() => {
      starts.push(rodTip.x);
    });
    return null;
  }

  root = createRoot(document.createElement("canvas"));
  await root.configure({ gl, frameloop: "never", size: { width: 1, height: 1, top: 0, left: 0 } });
  const scene = anglerFirst ? [<Angler key="angler" />, <Line key="line" />] : [<Line key="line" />, <Angler key="angler" />];
  await act(async () => {
    root?.render(<Suspense fallback={null}>{scene}</Suspense>);
  });
  await act(async () => {
    loadModel();
    await model;
  });
  advance(16);
  advance(32);
  return starts;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  vi.unstubAllGlobals();
});

describe("Scene frame order", () => {
  it("starts the line at this frame's rod tip when the angler mounts first, even after suspending", async () => {
    expect(await lineStarts(true)).toEqual([1, 2]);
  });

  it("leaves the line a frame behind the rod tip when the line mounts first", async () => {
    expect(await lineStarts(false)).toEqual([0, 1]);
  });
});
