/**
 * Centralised randomness.
 *
 * The generator state lives inside GameState, so a saved game resumes with the
 * identical random stream and tests can pin any outcome by choosing a seed.
 * Nothing else in the engine may call Math.random.
 *
 * mulberry32 — small, fast, good enough for shuffling a 60-card deck.
 */

export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, state: t };
}

export function randomInt(state: number, maxExclusive: number): { value: number; state: number } {
  const r = nextRandom(state);
  return { value: Math.floor(r.value * maxExclusive), state: r.state };
}

/** Fisher–Yates. Returns a new array; does not mutate the input. */
export function shuffle<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = randomInt(s, i + 1);
    s = r.state;
    const j = r.value;
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return { items: out, state: s };
}

/** Derives a numeric seed from an arbitrary string, so seeds can be shareable. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
