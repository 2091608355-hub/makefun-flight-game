// Skylark Courier — all the drawing: sky, sea, islands, runway, rings,
// clouds and the aeroplane itself, in one pseudo-3D chase view.
// Projection: forward is (sin h, -cos h); a point ahead of the plane
// lands on screen by its right/forward ratio times the focal length.

import { VIEW } from './config.js';
import { ISLANDS, RUNWAY } from './config.js';
import { OUTLINES, runwayCorners, terrainHeight, islandPeak, RUNWAY_HEIGHT, FAR_RIDGE, NEAR_RIDGE } from './world.js';
import { clamp, lerp, wrapAngle } from './random.js';

const W = VIEW.width, H = VIEW.height, FOCAL = VIEW.focal;

export function makeProjector(plane) {
  const sinH = Math.sin(plane.heading), cosH = Math.cos(plane.heading);
  const horizonY = H * 0.46 + Math.tan(plane.pitch) * FOCAL * 0.55;
  // The chase camera floats a little above the plane, so the ground the
  // plane stands on reads as a surface instead of a line at the horizon.
  const camAlt = plane.alt + 8;
  function project(x, y, z) {
    const dx = x - plane.x, dz = z - plane.z;
    const fwd = dx * sinH - dz * cosH;
    const right = dx * cosH + dz * sinH;
    if (fwd < 6) return null;
    return {
      x: W / 2 + (right / fwd) * FOCAL,
      y: horizonY - ((y - camAlt) / fwd) * FOCAL,
      d: fwd,
      scale: FOCAL / fwd,
    };
  }
  // Same projection, but points at or behind the camera are clamped
  // instead of dropped, so ground polygons never vanish up close.
  function projectClamp(x, y, z) {
    const dx = x - plane.x, dz = z - plane.z;
    const fwd = Math.max(8, dx * sinH - dz * cosH);
    const right = dx * cosH + dz * sinH;
    return {
      x: clamp(W / 2 + (right / fwd) * FOCAL, -400, W + 400),
      y: clamp(horizonY - ((y - camAlt) / fwd) * FOCAL, -400, H + 400),
      d: fwd,
      scale: FOCAL / fwd,
    };
  }
  return { project, projectClamp, horizonY, sinH, cosH };
}

function skyGradient(ctx, pal, horizonY) {
  const g = ctx.createLinearGradient(0, -220, 0, horizonY + 30);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(0.55, pal.skyMid);
  g.addColorStop(0.92, pal.skyLow);
  g.addColorStop(1, pal.horizonGlow);
  ctx.fillStyle = g;
  ctx.fillRect(-260, -260, W + 520, horizonY + 290);
}

function drawSun(ctx, pal, plane, horizonY) {
  const sunAz = 0.85;
  const rel = wrapAngle(sunAz - plane.heading);
  const sx = W / 2 + Math.tan(rel) * FOCAL * 1.1;
  const sy = horizonY - 150;
  if (sx < -260 || sx > W + 260) return;
  const glow = ctx.createRadialGradient(sx, sy, 6, sx, sy, 120);
  glow.addColorStop(0, pal.sunCore);
  glow.addColorStop(0.3, pal.sun);
  glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.sunCore;
  ctx.beginPath();
  ctx.arc(sx, sy, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawRidges(ctx, pal, plane, horizonY, ridgeFn, color, amp, baseY) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-260, horizonY + 4);
  for (let sx = -260; sx <= W + 260; sx += 26) {
    const bearing = Math.atan2(sx - W / 2, FOCAL) + plane.heading;
    const t = ((bearing / (Math.PI * 2)) % 1 + 1) % 1;
    const y = horizonY + 2 - ridgeFn(t) * amp - baseY;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W + 260, horizonY + 4);
  ctx.closePath();
  ctx.fill();
}

function drawSea(ctx, pal, horizonY, plane) {
  const g = ctx.createLinearGradient(0, horizonY, 0, H + 40);
  g.addColorStop(0, pal.seaFar);
  g.addColorStop(1, pal.seaNear);
  ctx.fillStyle = g;
  ctx.fillRect(-260, horizonY, W + 520, H - horizonY + 300);

  // Sun glitter: a shimmering path on the water toward the sun.
  const sunAz = 0.85;
  const rel = wrapAngle(sunAz - plane.heading);
  const gx = W / 2 + Math.tan(clamp(rel, -1.2, 1.2)) * FOCAL;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pal.seaGlitter;
  for (let i = 0; i < 26; i += 1) {
    const t = i / 26;
    const y = horizonY + 8 + t * t * (H - horizonY);
    const w = 12 + t * 150;
    const x = gx + Math.sin(i * 12.9898) * w * 0.5;
    ctx.fillRect(x - w / 2, y, w, 2.5);
  }
  ctx.restore();
}

function drawSeaGrid(ctx, plane, proj) {
  // World-locked dashes on the water: they stream past and sell speed.
  const step = 160;
  const minX = Math.floor((plane.x - 1600) / step) * step;
  const maxX = plane.x + 1600;
  const minZ = Math.floor((plane.z - 1600) / step) * step;
  const maxZ = plane.z + 1600;
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 2;
  for (let x = minX; x <= maxX; x += step) {
    for (let z = minZ; z <= maxZ; z += step) {
      const p = proj.project(x, 0, z);
      if (!p || p.y < proj.horizonY - 4 || p.y > H + 20) continue;
      const len = clamp(26 * p.scale, 2, 26);
      ctx.beginPath();
      ctx.moveTo(p.x - len / 2, p.y);
      ctx.lineTo(p.x + len / 2, p.y);
      ctx.stroke();
    }
  }
}

function drawIslands(ctx, pal, plane, proj) {
  for (let i = 0; i < ISLANDS.length; i += 1) {
    const isle = ISLANDS[i];
    const dx = isle.x - plane.x, dz = isle.z - plane.z;
    const fwd = dx * proj.sinH - dz * proj.cosH;
    if (fwd < -isle.r) continue;
    const outline = OUTLINES[i];
    const pts = [];
    let any = false;
    for (const pt of outline) {
      const p = proj.projectClamp(pt.x, isle.h * 0.6, pt.z);
      pts.push(p); any = true;
    }
    if (!any || pts.length < 3) continue;

    // Grass body with a sand rim for the beach, so the island reads as
    // land with a shoreline instead of a flat sandbar.
    const g = ctx.createLinearGradient(0, 0, 0, pts[0].y + 40);
    g.addColorStop(0, pal.islandGrass);
    g.addColorStop(1, '#3f7a37');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k += 1) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.islandSand;
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Peak cone, when the island is close enough to read: sunlit slope
    // on one side, shade on the other, snow on the very top.
    const pk = islandPeak(isle);
    const top = proj.project(pk.x, isle.h + isle.peak, pk.z);
    if (top && top.d < 2600) {
      const base = proj.project(pk.x, isle.h * 0.6, pk.z);
      if (base) {
        const w = clamp(isle.r * 0.45 * top.scale, 4, 320);
        ctx.fillStyle = '#6d8a6d';
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(base.x - w, base.y);
        ctx.lineTo(base.x, base.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = pal.mountain;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(base.x, base.y);
        ctx.lineTo(base.x + w, base.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(top.x - w * 0.26, top.y + (base.y - top.y) * 0.3);
        ctx.lineTo(top.x + w * 0.26, top.y + (base.y - top.y) * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawRunway(ctx, pal, plane, proj) {
  const r = runwayCorners();
  const y = RUNWAY_HEIGHT;
  const corners = r.corners.map((c) => proj.projectClamp(c.x, y, c.z));
  ctx.fillStyle = '#2e3138';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Centreline dashes.
  ctx.fillStyle = '#ffffff';
  for (let a = -RUNWAY.length / 2 + 24; a < RUNWAY.length / 2 - 12; a += 42) {
    const p1 = proj.project(RUNWAY.x + r.dir.x * a, y + 0.5, RUNWAY.z + r.dir.z * a);
    const p2 = proj.project(RUNWAY.x + r.dir.x * (a + 20), y + 0.5, RUNWAY.z + r.dir.z * (a + 20));
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineWidth = clamp(3 * p1.scale, 1, 7);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  // Threshold bars and the runway number at the near end.
  const near = proj.project(RUNWAY.x - r.dir.x * (RUNWAY.length / 2 - 14), y + 0.5, RUNWAY.z - r.dir.z * (RUNWAY.length / 2 - 14));
  if (near && near.d < 1400) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(clamp(30 * near.scale, 9, 42))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(RUNWAY.label, near.x, near.y);
  }
}

function drawRings(ctx, pal, plane, proj, rings, time) {
  const next = rings.find((r) => !r.passed);
  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    const c = proj.project(ring.x, ring.y, ring.z);
    if (!c || c.d < 30) continue;
    const view = Math.abs(Math.cos(wrapAngle(plane.heading - ring.facing)));
    const rx = 30 * c.scale;
    const ry = Math.max(rx * 0.22, rx * view);
    if (rx < 2) continue;
    const isNext = ring === next;
    const col = ring.passed ? '#3ddc84' : isNext ? pal.ringNext : pal.ring;
    const pulse = isNext ? 0.75 + Math.sin(time * 5) * 0.25 : 1;

    ctx.save();
    ctx.globalAlpha = 0.5 * pulse;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(2, rx * 0.28);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(2, rx * 0.09);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.max(2, rx * 0.06), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ring.passed ? '#3ddc84' : '#ffffff';
    ctx.font = `bold ${Math.round(clamp(rx * 0.5, 11, 30))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ring.passed ? '✓' : String(i + 1), c.x, c.y - ry - 6);
  }
}

function drawClouds(ctx, pal, plane, proj, clouds, time) {
  for (const cloud of clouds) {
    const c = proj.project(cloud.x, cloud.y, cloud.z);
    if (!c || c.d < 40) continue;
    const s = cloud.s * c.scale;
    if (s < 3 || s > 900) continue;
    ctx.save();
    ctx.globalAlpha = clamp(0.72 - c.d / 9000, 0.2, 0.72);
    ctx.fillStyle = pal.cloud;
    const rng = cloud.seed;
    for (let i = 0; i < cloud.puffs; i += 1) {
      const px = c.x + (((rng >> (i * 5)) % 97) / 97 - 0.5) * s * 1.6;
      const py = c.y + (((rng >> (i * 7 + 3)) % 89) / 89 - 0.5) * s * 0.5;
      const pr = s * (0.28 + ((rng >> (i * 3 + 1)) % 53) / 53 * 0.22);
      ctx.beginPath();
      ctx.ellipse(px, py, pr, pr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  void time;
}

function drawPlaneShadow(ctx, plane, proj) {
  if (plane.alt > 160) return;
  const ground = terrainHeight(plane.x, plane.z);
  const p = proj.project(plane.x, ground + 1, plane.z);
  if (!p) return;
  const w = clamp(90 * p.scale * (1 - plane.alt / 220), 6, 120);
  ctx.fillStyle = 'rgba(10, 20, 30, 0.30)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, w, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The aeroplane, rear chase view: tail, fin, wings and fuselage, banked
// with the plane. Drawn unrotated by the world roll, banked on its own.
export function drawPlane(ctx, plane, time) {
  const cx = W / 2, cy = H * 0.695;
  const bank = plane.bank;
  const scale = 0.9 * (1 + clamp(plane.speed / 200, 0, 0.12));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank * 0.85);
  ctx.scale(scale, scale);
  const bob = Math.sin(time * 2.2) * 2 * clamp(plane.speed / 60, 0, 1);
  ctx.translate(0, bob);

  const body = ctx.createLinearGradient(-40, 0, 40, 0);
  body.addColorStop(0, '#8fa8c0');
  body.addColorStop(0.5, '#e8eef4');
  body.addColorStop(1, '#7d94ab');
  // Fuselage, seen from behind: wide at the tail, tapering away.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-34, 96);
  ctx.quadraticCurveTo(-40, 10, -16, -58);
  ctx.quadraticCurveTo(0, -74, 16, -58);
  ctx.quadraticCurveTo(40, 10, 34, 96);
  ctx.quadraticCurveTo(0, 108, -34, 96);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,60,80,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Panel lines down the fuselage.
  ctx.strokeStyle = 'rgba(60,80,100,0.35)';
  ctx.beginPath();
  ctx.moveTo(-12, -52); ctx.lineTo(-20, 88);
  ctx.moveTo(12, -52); ctx.lineTo(20, 88);
  ctx.stroke();
  // Yellow cheatlines along the fuselage sides — the courier's livery.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-24, -30); ctx.lineTo(-30, 82);
  ctx.moveTo(24, -30); ctx.lineTo(30, 82);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  // Canopy glint at the far end.
  const canopy = ctx.createLinearGradient(0, -58, 0, -20);
  canopy.addColorStop(0, '#bfe6ff');
  canopy.addColorStop(1, '#2c5a80');
  ctx.fillStyle = canopy;
  ctx.beginPath();
  ctx.ellipse(0, -40, 13, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main wings with dihedral, aileron lines and tip lights.
  const wing = ctx.createLinearGradient(0, -30, 0, 30);
  wing.addColorStop(0, '#dfe9f2');
  wing.addColorStop(1, '#93a8bd');
  ctx.fillStyle = wing;
  ctx.beginPath();
  ctx.moveTo(-30, -6); ctx.lineTo(-218, 34); ctx.lineTo(-212, 52); ctx.lineTo(-26, 26);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30, -6); ctx.lineTo(218, 34); ctx.lineTo(212, 52); ctx.lineTo(26, 26);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,60,80,0.4)';
  ctx.beginPath();
  ctx.moveTo(-150, 22); ctx.lineTo(-146, 38);
  ctx.moveTo(150, 22); ctx.lineTo(146, 38);
  ctx.stroke();
  // Yellow wingtips, so the wings read at a glance against sea and sky.
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(-196, 29); ctx.lineTo(-218, 34); ctx.lineTo(-212, 52); ctx.lineTo(-192, 47);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(196, 29); ctx.lineTo(218, 34); ctx.lineTo(212, 52); ctx.lineTo(192, 47);
  ctx.closePath(); ctx.fill();

  // Tailplane and fin.
  ctx.fillStyle = '#aebfd0';
  ctx.beginPath();
  ctx.moveTo(-14, 62); ctx.lineTo(-92, 84); ctx.lineTo(-88, 96); ctx.lineTo(-12, 84);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 62); ctx.lineTo(92, 84); ctx.lineTo(88, 96); ctx.lineTo(12, 84);
  ctx.closePath(); ctx.fill();
  const fin = ctx.createLinearGradient(0, 60, 0, -10);
  fin.addColorStop(0, '#e8eef4');
  fin.addColorStop(1, '#3f6f9e');
  ctx.fillStyle = fin;
  ctx.beginPath();
  ctx.moveTo(-13, 78); ctx.lineTo(-10, -4); ctx.quadraticCurveTo(0, -16, 10, -4);
  ctx.lineTo(13, 78); ctx.closePath(); ctx.fill();
  // Skylark mark on the fin.
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(0, 34, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c4a66';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', 0, 35);

  // Registration on the rear fuselage.
  ctx.fillStyle = 'rgba(30,50,70,0.75)';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SK-07', 0, 66);

  // Navigation lights: red left, green right, white strobe on the tail.
  const blink = Math.sin(time * 6) > 0;
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath(); ctx.arc(-216, 42, blink ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#35e07a';
  ctx.beginPath(); ctx.arc(216, 42, blink ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
  if (Math.sin(time * 2.4) > 0.86) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 100, 5, 0, Math.PI * 2); ctx.fill();
  }

  // Wingtip vortices when banked hard or fast.
  if (Math.abs(bank) > 0.45 || plane.speed > 74) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-218, 44); ctx.quadraticCurveTo(-248, 60, -236, 92);
    ctx.moveTo(218, 44); ctx.quadraticCurveTo(248, 60, 236, 92);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderWorld(ctx, game) {
  const { plane, palette, rings, clouds, time } = game;
  const proj = makeProjector(plane);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-plane.bank * 0.32);
  ctx.translate(-W / 2, -H / 2);

  skyGradient(ctx, palette, proj.horizonY);
  drawSun(ctx, palette, plane, proj.horizonY);
  drawRidges(ctx, palette, plane, proj.horizonY, FAR_RIDGE, palette.mountainFar, 26, 0);
  drawRidges(ctx, palette, plane, proj.horizonY, NEAR_RIDGE, palette.mountain, 40, 6);
  drawSea(ctx, palette, proj.horizonY, plane);
  drawSeaGrid(ctx, plane, proj);
  drawIslands(ctx, palette, plane, proj);
  drawRunway(ctx, palette, plane, proj);
  drawRings(ctx, palette, plane, proj, rings, time);
  drawClouds(ctx, palette, plane, proj, clouds, time);
  drawPlaneShadow(ctx, plane, proj);
  ctx.restore();

  drawPlane(ctx, plane, time);

  // Speed streaks at the frame edges when fast.
  if (plane.speed > 62 && plane.airborne) {
    ctx.save();
    ctx.globalAlpha = clamp((plane.speed - 62) / 40, 0, 0.5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      const y = ((i * 137 + time * 900) % 720);
      ctx.beginPath();
      ctx.moveTo(6, y); ctx.lineTo(6 + 34, y);
      ctx.moveTo(W - 6, y); ctx.lineTo(W - 40, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
