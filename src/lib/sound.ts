const SOUND_KEY = "tracker.soundEnabled";

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent("tracker:sound-changed", { detail: enabled }));
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = { freq: number; dur: number; type?: OscillatorType; vol?: number; delay?: number };

function playTones(tones: Tone[]) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  for (const t of tones) {
    const start = now + (t.delay ?? 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.setValueAtTime(t.freq, start);
    const vol = t.vol ?? 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

export type SoundName = "complete" | "uncomplete" | "delete" | "goal";

export function playSound(name: SoundName) {
  if (!getSoundEnabled()) return;
  switch (name) {
    case "complete":
      playTones([
        { freq: 660, dur: 0.09, type: "sine", vol: 0.09 },
        { freq: 880, dur: 0.12, type: "sine", vol: 0.09, delay: 0.07 },
      ]);
      break;
    case "uncomplete":
      playTones([{ freq: 440, dur: 0.08, type: "sine", vol: 0.05 }]);
      break;
    case "delete":
      playTones([
        { freq: 300, dur: 0.08, type: "triangle", vol: 0.06 },
        { freq: 180, dur: 0.12, type: "triangle", vol: 0.06, delay: 0.06 },
      ]);
      break;
    case "goal":
      playTones([
        { freq: 523.25, dur: 0.14, type: "triangle", vol: 0.1 },
        { freq: 659.25, dur: 0.14, type: "triangle", vol: 0.1, delay: 0.12 },
        { freq: 783.99, dur: 0.18, type: "triangle", vol: 0.1, delay: 0.24 },
        { freq: 1046.5, dur: 0.28, type: "triangle", vol: 0.11, delay: 0.38 },
      ]);
      break;
  }
}