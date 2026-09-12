// A small synthesized dot-matrix sound. Created only after a visitor gesture.
// It represents activity, never numerical progress or a scientific measurement.
export function createPrinterAudio() {
  const context = new AudioContext();
  let timer: ReturnType<typeof setInterval> | undefined;
  const tick = () => {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(95, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(180, context.currentTime + 0.09);
    gain.gain.setValueAtTime(0.014, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.11);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.12);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  };
  return {
    start() { if (timer) return; void context.resume().catch(() => {}); tick(); timer = setInterval(tick, 145); },
    stop() { if (timer) clearInterval(timer); timer = undefined; },
    close() { if (timer) clearInterval(timer); timer = undefined; void context.close().catch(() => {}); },
  };
}
