// Skylark Courier — small deterministic random helpers.
// One seeded stream per island / cloud bank, so the world looks the
// same every flight and every screenshot.

export function makeSeeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// Smooth 1-D value noise from a seeded stream, for ridge silhouettes.
export function makeRidge(seed, points, base, amp) {
  const rng = makeSeeded(seed);
  const knots = [];
  for (let i = 0; i < points; i += 1) knots.push(base + rng() * amp);
  return function heightAt(t) {
    const x = t * (points - 1);
    const i = Math.min(points - 2, Math.floor(x));
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    return knots[i] * (1 - s) + knots[i + 1] * s;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function angleDiff(a, b) {
  return wrapAngle(a - b);
}
