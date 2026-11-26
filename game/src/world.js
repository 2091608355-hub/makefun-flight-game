// Skylark Courier — the island chain, runway, rings and clouds.
// The world is a flat sea with raised islands; terrainHeight answers
// "how high is the ground here" for collisions and shadows.

import { ISLANDS, RUNWAY } from './config.js';
import { makeSeeded, makeRidge, range } from './random.js';

// Coastline points for one island, in world metres, clockwise.
export function islandOutline(island) {
  const rng = makeSeeded(island.seed * 7919 + 13);
  const pts = [];
  const n = 26;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 0.78 + rng() * 0.42;
    pts.push({
      x: island.x + Math.cos(a) * island.r * wobble,
      z: island.z + Math.sin(a) * island.r * wobble * 0.92,
    });
  }
  return pts;
}

// Precomputed outlines, one per island, in ISLANDS order.
export const OUTLINES = ISLANDS.map(islandOutline);

function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function islandAt(x, z) {
  for (let i = 0; i < ISLANDS.length; i += 1) {
    const isle = ISLANDS[i];
    const dx = x - isle.x, dz = z - isle.z;
    if (dx * dx + dz * dz > (isle.r * 1.25) * (isle.r * 1.25)) continue;
    if (pointInPolygon(x, z, OUTLINES[i])) return isle;
  }
  return null;
}

// The peak of an island sits off-centre, so the home island's runway
// stays on flat ground.
export function islandPeak(isle) {
  return { x: isle.x + isle.r * 0.5, z: isle.z + isle.r * 0.4 };
}

// The runway is flat ground: a constant height wherever it runs.
export const RUNWAY_HEIGHT = 12;

// Ground height in metres: sea is 0, islands rise to a flat top with a
// single peak bump offset from the centre.
export function terrainHeight(x, z) {
  if (overRunway(x, z, 30)) return RUNWAY_HEIGHT;
  const isle = islandAt(x, z);
  if (!isle) return 0;
  const dx = (x - isle.x) / isle.r, dz = (z - isle.z) / isle.r;
  const d = Math.sqrt(dx * dx + dz * dz);
  const edge = Math.max(0, 1 - d * 1.15);
  const pk = islandPeak(isle);
  const pd = Math.hypot(x - pk.x, z - pk.z) / isle.r;
  const peak = isle.peak * Math.max(0, 1 - pd * 2.2);
  return isle.h * edge + peak * edge;
}

// Runway corners in world space, plus centreline points for dashes.
export function runwayCorners() {
  // Flight-heading convention: heading h flies (sin h, -cos h), so a
  // runway heading of 90 degrees (east) runs along +x.
  const dirX = Math.sin(RUNWAY.heading), dirZ = -Math.cos(RUNWAY.heading);
  const perpX = -dirZ, perpZ = dirX;
  const hl = RUNWAY.length / 2, hw = RUNWAY.width / 2;
  const c = (along, side) => ({
    x: RUNWAY.x + dirX * along + perpX * side,
    z: RUNWAY.z + dirZ * along + perpZ * side,
  });
  return {
    corners: [c(-hl, -hw), c(hl, -hw), c(hl, hw), c(-hl, hw)],
    centre: { x: RUNWAY.x, z: RUNWAY.z },
    dir: { x: dirX, z: dirZ },
    perp: { x: perpX, z: perpZ },
  };
}

// True when (x, z) is over the runway strip (a little margin allowed).
export function overRunway(x, z, margin = 6) {
  const r = runwayCorners();
  const dx = x - r.centre.x, dz = z - r.centre.z;
  const along = dx * r.dir.x + dz * r.dir.z;
  const side = dx * r.perp.x + dz * r.perp.z;
  return Math.abs(along) <= RUNWAY.length / 2 + margin
    && Math.abs(side) <= RUNWAY.width / 2 + margin;
}

export function runwayAlignment(heading) {
  // Angle against the runway axis, 0 = perfectly lined up either way.
  const a = Math.atan2(Math.sin(heading - RUNWAY.heading), Math.cos(heading - RUNWAY.heading));
  const d = Math.abs(a);
  return Math.min(d, Math.PI - d);
}

// Rings for a mission, each with a facing direction (towards the next ring).
export function buildRings(mission) {
  return mission.rings.map((r, i) => {
    const next = mission.rings[i + 1] || { x: RUNWAY.x, z: RUNWAY.z };
    const dx = next.x - r.x, dz = next.z - r.z;
    const facing = Math.atan2(dx, -dz);
    return { ...r, facing, passed: false, centreHit: false };
  });
}

// Cloud puffs scattered over the map, each with a world position and size.
export function buildClouds() {
  const rng = makeSeeded(20261126);
  const clouds = [];
  for (let i = 0; i < 42; i += 1) {
    clouds.push({
      x: range(rng, -3200, 3200),
      z: range(rng, -3200, 3200),
      y: range(rng, 420, 720),
      s: range(rng, 90, 260),
      puffs: 3 + Math.floor(rng() * 3),
      seed: Math.floor(rng() * 1e9),
    });
  }
  return clouds;
}

// Two distant ridge lines for the horizon, as functions of heading angle.
export const FAR_RIDGE = makeRidge(101, 24, 0.10, 0.16);
export const NEAR_RIDGE = makeRidge(207, 18, 0.16, 0.22);
