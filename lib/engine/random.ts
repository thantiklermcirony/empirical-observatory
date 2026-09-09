/** Deterministic PRNG for repeatable simulations. Not for secrets or security. */
export function random(seed: number) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Seed must be a 32-bit unsigned integer.');
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x: number, lo = 0, hi = 1) =>
  Math.min(hi, Math.max(lo, x));
export const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
export function shuffle<T>(items: T[], seed: number) {
  const out = [...items],
    r = random(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function finite(
  x: unknown,
  label: string,
  min = -Infinity,
  max = Infinity,
): number {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max)
    throw new Error(`${label} must be between ${min} and ${max}.`);
  return x;
}
