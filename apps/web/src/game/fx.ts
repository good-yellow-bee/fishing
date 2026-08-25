let ctx: AudioContext | null = null;

function audio() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.04) {
  const ac = audio();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export const fx = {
  enabled: true,
  cast() {
    if (this.enabled) beep(180, 0.12, "triangle");
  },
  splash() {
    if (this.enabled) beep(90, 0.18, "sawtooth", 0.03);
  },
  bite() {
    if (this.enabled) beep(420, 0.08, "square", 0.03);
  },
  land() {
    if (this.enabled) beep(520, 0.2, "triangle", 0.05);
  },
  snap() {
    if (this.enabled) beep(70, 0.25, "sawtooth", 0.05);
  },
};
