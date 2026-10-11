// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ambientProfile, fx } from "./fx";

const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
const node = () => ({ connect: <T,>(next: T) => next, disconnect() {} });

/** Loop sources that are playing right now: the lapping water, plus the rain hiss when it rains. */
const loops = new Set<object>();
const tones: number[] = [];

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  sampleRate = 8000;
  destination = node();
  resume() {
    return Promise.resolve();
  }
  createGain() {
    return { ...node(), gain: param() };
  }
  createBiquadFilter() {
    return { ...node(), type: "lowpass", frequency: param(), Q: param() };
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const source = {
      ...node(),
      buffer: null,
      loop: false,
      start() {
        if (source.loop) loops.add(source);
      },
      stop() {
        loops.delete(source);
      },
    };
    return source;
  }
  createOscillator() {
    const frequency = { ...param(), setValueAtTime: (value: number) => tones.push(value) };
    return { ...node(), type: "sine", frequency, detune: param(), start() {}, stop() {} };
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  fx.ambient.stop();
  fx.ambient.setConditions("day", "clear");
  loops.clear();
  tones.length = 0;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ambient conditions", () => {
  it("plays birds by day, crickets and loons at night, and rain only when it rains", () => {
    expect(ambientProfile("day", "clear")).toEqual({ wildlife: "birds", loons: false, rain: false });
    expect(ambientProfile("dawn", "overcast")).toEqual({ wildlife: "birds", loons: false, rain: false });
    expect(ambientProfile("dusk", "rain")).toEqual({ wildlife: "birds", loons: false, rain: true });
    expect(ambientProfile("night", "fog")).toEqual({ wildlife: "crickets", loons: true, rain: false });
    expect(ambientProfile("night", "rain")).toEqual({ wildlife: "crickets", loons: true, rain: true });
  });

  it("starts the rain hiss with the lake on a rainy day and stops it when the sky clears", () => {
    fx.ambient.setConditions("day", "rain");
    fx.ambient.start();
    expect(loops.size).toBe(2);
    fx.ambient.setConditions("day", "clear");
    expect(loops.size).toBe(1);
    fx.ambient.setConditions("night", "rain");
    expect(loops.size).toBe(2);
    fx.ambient.stop();
    expect(loops.size).toBe(0);
  });

  it("swaps birdsong for crickets and loon calls when night falls", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const bird = 2700;
    const cricket = 3950;
    const loon = 560;
    fx.ambient.start();
    vi.advanceTimersByTime(4000);
    expect(tones).toContain(bird);
    expect(tones).not.toContain(cricket);

    fx.ambient.setConditions("night", "clear");
    tones.length = 0;
    vi.advanceTimersByTime(10_000);
    expect(tones).toContain(cricket);
    expect(tones).toContain(loon);
    expect(tones).not.toContain(bird);
  });
});

describe("fx haptics", () => {
  afterEach(() => {
    fx.hapticsEnabled = true;
    vi.unstubAllGlobals();
  });

  it("vibrates the beat's pattern where the phone can", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...navigator, vibrate });
    fx.haptic("surge");
    expect(vibrate).toHaveBeenCalledWith([30, 40, 30]);
  });

  it("stays quiet without vibrate, or when switched off", () => {
    vi.stubGlobal("navigator", { ...navigator, vibrate: undefined });
    expect(() => fx.haptic("bite")).not.toThrow();
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...navigator, vibrate });
    fx.hapticsEnabled = false;
    fx.haptic("bite");
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe("fx drag", () => {
  it("starts on the first tone, keeps one voice, and stops", () => {
    fx.drag.set({ gain: 0.01, hz: 200, rasp: true, hiss: true });
    fx.drag.set({ gain: 0.02, hz: 300, rasp: false, hiss: false });
    expect(fx.drag.playing).toBe(true);
    fx.drag.stop();
    expect(fx.drag.playing).toBe(false);
  });

  it("goes quiet when the sound is muted", () => {
    fx.drag.set({ gain: 0.01, hz: 200, rasp: false, hiss: false });
    fx.enabled = false;
    fx.drag.set({ gain: 0.01, hz: 200, rasp: false, hiss: false });
    expect(fx.drag.playing).toBe(false);
    fx.enabled = true;
  });
});
