// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ambientProfile, BELL_PARTIALS, BELL_PITCH, BELL_STRIKES, fx, onLoonCall, onOwlHoot } from "./fx";

const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
const node = () => ({ connect: <T,>(next: T) => next, disconnect() {} });

/** Loop sources that are playing right now: the lapping water, plus the rain hiss when it rains. */
const loops = new Set<object>();
const tones: number[] = [];
/** Where each panned call was placed. */
const pans: number[] = [];

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
  createStereoPanner() {
    const pan = { ...param(), set value(v: number) { pans.push(v); }, get value() { return 0; } };
    return { ...node(), pan };
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

describe("nature volume", () => {
  it("keeps its own level inside 0..1", () => {
    fx.natureVolume = 2;
    expect(fx.natureVolume).toBe(1);
    fx.natureVolume = -1;
    expect(fx.natureVolume).toBe(0);
    fx.natureVolume = 0.4;
    expect(fx.natureVolume).toBe(0.4);
    fx.natureVolume = 1;
  });
});

describe("ambient conditions", () => {
  it("plays birds by day, crickets and loons at night, and rain only when it rains", () => {
    expect(ambientProfile("day", "clear")).toMatchObject({ wildlife: "birds", loons: false, rain: false });
    expect(ambientProfile("day", "rain", "winter")).toMatchObject({ rain: false, wind: true });
    expect(ambientProfile("day", "rain", "fall")).toMatchObject({ rain: true });
    expect(ambientProfile("dawn", "overcast", "fall")).toMatchObject({ wildlife: "birds", loons: false, rain: false });
    expect(ambientProfile("dusk", "rain")).toMatchObject({ wildlife: "birds", loons: false, rain: true });
    expect(ambientProfile("night", "fog")).toMatchObject({ wildlife: "crickets", loons: true, rain: false });
    expect(ambientProfile("night", "rain")).toEqual({ wildlife: "crickets", loons: true, rain: true, geese: false, wind: false, frogs: true, owls: true });
  });

  it("follows the season: geese over in fall, a chickadee and the wind in winter, quiet winter nights", () => {
    expect(ambientProfile("day", "clear", "fall")).toMatchObject({ wildlife: "birds", geese: true, wind: false });
    expect(ambientProfile("day", "rain", "fall").geese).toBe(false);
    expect(ambientProfile("night", "clear", "fall")).toMatchObject({ wildlife: "crickets", loons: true, geese: false });
    expect(ambientProfile("day", "clear", "winter")).toMatchObject({ wildlife: "chickadees", loons: false, wind: true });
    expect(ambientProfile("night", "clear", "winter")).toMatchObject({ wildlife: "quiet", loons: false, wind: true });
    expect(ambientProfile("dawn", "clear", "spring")).toMatchObject({ wildlife: "chorus", geese: false, wind: false });
  });

  it("blows a wind loop in winter and drops it when the season turns", () => {
    fx.ambient.setConditions("night", "clear", "winter");
    fx.ambient.start();
    expect(loops.size).toBe(2);
    vi.advanceTimersByTime(60000);
    // A winter night has no crickets and no loons.
    expect(tones).toEqual([]);
    fx.ambient.setConditions("night", "clear", "summer");
    expect(loops.size).toBe(1);
  });

  it("tells the scene when the loon calls, and pans the call to where the loon swims", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    pans.length = 0;
    const heard = vi.fn();
    const stop = onLoonCall(heard);
    fx.ambient.setLoonPlace(-0.6, 0.4);
    fx.ambient.setConditions("night", "clear", "summer");
    fx.ambient.start();
    vi.advanceTimersByTime(10_000);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(pans).toEqual([-0.6]);
    stop();
    vi.advanceTimersByTime(30_000);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("lets the owl hoot through the night, but not in winter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const heard = vi.fn();
    const stop = onOwlHoot(heard);
    fx.ambient.setConditions("night", "clear", "summer");
    fx.ambient.start();
    vi.advanceTimersByTime(12_000);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(tones).toContain(380);
    fx.ambient.setConditions("night", "clear", "winter");
    vi.advanceTimersByTime(60_000);
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });

  it("sends geese over on a fall day", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    fx.ambient.setConditions("day", "clear", "fall");
    fx.ambient.start();
    vi.advanceTimersByTime(11000);
    expect(tones).toContain(330);
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

describe("dawn chorus", () => {
  it("fills spring and summer dawns, but not a rainy one, a fall one, or later in the day", () => {
    expect(ambientProfile("dawn", "clear", "spring").wildlife).toBe("chorus");
    expect(ambientProfile("dawn", "overcast", "summer").wildlife).toBe("chorus");
    expect(ambientProfile("dawn", "rain", "summer").wildlife).toBe("birds");
    expect(ambientProfile("dawn", "clear", "fall").wildlife).toBe("birds");
    expect(ambientProfile("day", "clear", "summer").wildlife).toBe("birds");
  });

  it("sings far more often than the daytime birds", () => {
    fx.ambient.setConditions("dawn", "clear", "summer");
    fx.ambient.start();
    vi.advanceTimersByTime(10_000);
    const dawn = tones.length;
    fx.ambient.stop();
    tones.length = 0;
    fx.ambient.setConditions("day", "clear", "summer");
    fx.ambient.start();
    vi.advanceTimersByTime(10_000);
    expect(dawn).toBeGreaterThan(tones.length * 3);
  });
});

describe("frogs", () => {
  it("call from the reeds on spring and summer evenings and nights only", () => {
    expect(ambientProfile("dusk", "clear", "summer").frogs).toBe(true);
    expect(ambientProfile("night", "rain", "spring").frogs).toBe(true);
    expect(ambientProfile("day", "clear", "summer").frogs).toBe(false);
    expect(ambientProfile("dusk", "clear", "fall").frogs).toBe(false);
    expect(ambientProfile("night", "clear", "winter").frogs).toBe(false);
  });

  it("add their calls to a summer dusk and go quiet when fall comes", () => {
    // Pinned: the calls and their gaps are random, and a run of single peeps once left too few to count.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    fx.ambient.setConditions("dusk", "clear", "fall");
    fx.ambient.start();
    vi.advanceTimersByTime(20_000);
    const fall = tones.length;
    fx.ambient.stop();
    tones.length = 0;
    fx.ambient.setConditions("dusk", "clear", "summer");
    fx.ambient.start();
    vi.advanceTimersByTime(20_000);
    expect(tones.length).toBeGreaterThan(fall + 10);
  });
});

describe("rod bell", () => {
  it("jingles twice on a nibble and rings harder on a bite, each strike with its overtones", () => {
    fx.rodBell("jingle");
    expect(tones).toHaveLength(BELL_STRIKES.jingle.length * BELL_PARTIALS.length);
    expect(tones[0]).toBeCloseTo(BELL_PITCH);
    expect(tones[1]).toBeCloseTo(BELL_PITCH * BELL_PARTIALS[1]);
    tones.length = 0;
    fx.rodBell("ring");
    expect(tones.length).toBeGreaterThan(BELL_STRIKES.jingle.length * BELL_PARTIALS.length);
  });

  it("stays quiet when sound is off", () => {
    fx.enabled = false;
    fx.rodBell("ring");
    fx.enabled = true;
    expect(tones).toHaveLength(0);
  });
});

describe("deer and ducklings", () => {
  it("snort and peep once the lake's sounds are going, and not before", () => {
    fx.snort();
    fx.peep();
    expect(tones).toHaveLength(0);
    fx.ambient.start();
    tones.length = 0;
    fx.peep();
    expect(tones.length).toBeGreaterThan(0);
    expect(Math.min(...tones)).toBeGreaterThanOrEqual(3000);
  });

  it("stay quiet when sound is off", () => {
    fx.ambient.start();
    tones.length = 0;
    fx.enabled = false;
    fx.peep();
    fx.snort();
    fx.enabled = true;
    expect(tones).toHaveLength(0);
  });
});
