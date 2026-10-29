import type { NotificationPreferences } from "../account/AccountProvider";
let context: AudioContext | undefined;
let last = 0;
export async function unlockSound() {
  context ??= new AudioContext();
  if (context.state !== "running") await context.resume();
}
export function playAlertSound(p: NotificationPreferences, preview = false) {
  if (!p.sound && !preview) return;
  if (!context || context.state !== "running") return;
  if (!preview && Date.now() - last < 2500) return;
  last = Date.now();
  const notes =
    p.tone === "whistle"
      ? [1400, 1700]
      : p.tone === "soft"
        ? [660, 880]
        : [523, 659, 784];
  notes.forEach((frequency, i) => {
    const oscillator = context!.createOscillator(),
      gain = context!.createGain(),
      at = context!.currentTime + i * 0.14;
    oscillator.type = p.tone === "whistle" ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(p.volume * 0.16, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.24);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}

export async function playOnceForAlert(
  id: string,
  owner: string,
  p: NotificationPreferences,
) {
  if (!p.sound || !context || context.state !== "running" || document.hidden)
    return;
  const run = () => {
    try {
      const key = "sportstates:last-alert-sound:" + owner;
      const previous = JSON.parse(localStorage.getItem(key) || "null");
      if (previous && (previous.id === id || Date.now() - previous.at < 2500))
        return;
      localStorage.setItem(key, JSON.stringify({ id, at: Date.now() }));
    } catch {
      /* Local cooldown remains available without storage. */
    }
    playAlertSound(p);
  };
  if (navigator.locks)
    await navigator.locks.request("sportstates-alert-sound:" + owner, run);
  else run();
}
