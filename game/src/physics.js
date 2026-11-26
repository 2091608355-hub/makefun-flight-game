// Skylark Courier — arcade flight model.
// The plane is a point with speed, heading, pitch and bank; the fun is
// in trading speed for height and banking cleanly through the rings.

import { PLANE } from './config.js';
import { clamp, wrapAngle } from './random.js';
import { terrainHeight, overRunway, runwayAlignment } from './world.js';

export function freshPlane(mission) {
  return {
    x: 0, z: 0, alt: 0,
    heading: 0, pitch: 0, bank: 0,
    speed: 0, throttle: 0,
    vspeed: 0, fuel: mission.fuel, damage: 0,
    airborne: false, landed: false, crashed: false,
    ringsPassed: 0, score: 0, time: 0, centreHits: 0,
    message: '', messageUntil: 0,
  };
}

export function placeOnRunway(plane, runway) {
  const dirX = Math.sin(runway.heading), dirZ = -Math.cos(runway.heading);
  const back = runway.length / 2 - 70;
  plane.x = runway.x - dirX * back;
  plane.z = runway.z - dirZ * back;
  plane.alt = terrainHeight(plane.x, plane.z);
  plane.heading = runway.heading;
  plane.pitch = 0; plane.bank = 0; plane.speed = 0; plane.throttle = 0;
  plane.vspeed = 0; plane.airborne = false; plane.landed = false;
  plane.crashed = false;
}

// One simulation step. ctl: {pitch (-1..1), bank (-1..1), throttle (-1..1 delta), brake}.
// Returns an event string when something notable happens, else ''.
export function stepPlane(plane, ctl, mission, dt) {
  if (plane.crashed || plane.landed) return '';
  plane.time += dt;

  // Throttle lever, eased toward its target.
  plane.throttle = clamp(plane.throttle + ctl.throttle * dt * 0.9, 0, 1);
  if (ctl.brake) plane.throttle = Math.max(0, plane.throttle - dt * 1.4);

  // Fuel: the lever position decides the burn; empty tanks mean a glide.
  const burn = (PLANE.fuelBurnIdle + plane.throttle * PLANE.fuelBurnFull) * dt;
  plane.fuel = Math.max(0, plane.fuel - burn);
  const power = plane.fuel > 0 ? plane.throttle : 0;

  // Speed chases the throttle's target speed, with drag on top.
  const target = PLANE.minSpeed + power * (PLANE.maxSpeed - PLANE.minSpeed);
  const drag = PLANE.drag * (plane.speed / PLANE.maxSpeed);
  plane.speed += ((target - plane.speed) * 0.32 - drag * plane.speed * 0.12) * dt;
  if (ctl.brake && !plane.airborne) plane.speed = Math.max(0, plane.speed - 26 * dt);
  plane.speed = Math.max(0, plane.speed);

  // Bank and pitch ease toward the stick, then hold.
  const bankTarget = clamp(ctl.bank, -1, 1) * PLANE.maxBank;
  const pitchTarget = clamp(ctl.pitch, -1, 1) * PLANE.maxPitch;
  plane.bank += (bankTarget - plane.bank) * Math.min(1, PLANE.bankRate * dt);
  plane.pitch += (pitchTarget - plane.pitch) * Math.min(1, PLANE.pitchRate * dt);

  // A banked wing turns the nose: coordinated-turn rate.
  const turnRate = (9.81 * Math.tan(plane.bank)) / Math.max(plane.speed, 12);
  plane.heading = wrapAngle(plane.heading + turnRate * dt);

  // Wind pushes the plane sideways, stronger at altitude, gusty on mail runs.
  const gust = mission.gusts ? Math.sin(plane.time * 0.7) * 0.5 + Math.sin(plane.time * 1.9) * 0.3 : 0;
  const wind = mission.wind * (1 + gust * 0.4);
  const windX = Math.sin(mission.windDir) * wind;
  const windZ = -Math.cos(mission.windDir) * wind;

  // Climb needs speed; slow flight sinks and then stalls.
  const stalling = plane.speed < PLANE.stallSpeed;
  let vspeed = plane.speed * Math.sin(plane.pitch);
  if (stalling) vspeed -= (PLANE.stallSpeed - plane.speed) * 0.35;
  if (!plane.airborne && plane.speed < PLANE.stallSpeed * 1.05) vspeed = Math.min(vspeed, 0);
  plane.vspeed = vspeed;
  plane.alt += vspeed * dt;

  // Move over the map, wind included.
  plane.x += (Math.sin(plane.heading) * plane.speed + windX) * dt;
  plane.z += (-Math.cos(plane.heading) * plane.speed + windZ) * dt;

  // Take-off: wheels leave the ground once fast enough with a pull.
  const ground = terrainHeight(plane.x, plane.z);
  if (!plane.airborne && plane.speed > PLANE.stallSpeed && plane.pitch > 0.06) {
    plane.airborne = true;
    return 'takeoff';
  }

  // Touching the ground: runway landing, hard landing, or a crash.
  // Climbing away from it right after lift-off is not a touchdown.
  if (plane.alt <= ground + 0.4) {
    plane.alt = Math.max(plane.alt, ground);
    if (!plane.airborne) return '';
    if (vspeed > 0.5) return '';
    const aligned = runwayAlignment(plane.heading) < PLANE.runwayAlign;
    const onStrip = overRunway(plane.x, plane.z);
    if (onStrip && aligned && Math.abs(vspeed) <= PLANE.safeLandingVSpeed && plane.speed <= PLANE.safeLandingSpeed) {
      plane.landed = true;
      plane.airborne = false;
      plane.speed = Math.max(0, plane.speed - 12);
      return 'landed';
    }
    if (onStrip && aligned && Math.abs(vspeed) <= PLANE.hardLandingVSpeed) {
      plane.damage += 30;
      plane.airborne = false;
      plane.speed *= 0.5;
      plane.alt = ground;
      return plane.damage >= 100 ? crash(plane, 'hard landing') : 'bounced';
    }
    return crash(plane, ground > 2 ? 'terrain' : 'water');
  }

  if (stalling && plane.airborne) return 'stall';
  return '';
}

function crash(plane, why) {
  plane.crashed = true;
  plane.crashWhy = why;
  plane.airborne = false;
  return 'crashed';
}

// Ring pass: the plane crossed the ring's facing plane close to centre.
export function checkRing(plane, ring, prevForward) {
  if (ring.passed) return null;
  const dx = plane.x - ring.x, dz = plane.z - ring.z;
  const nx = Math.sin(ring.facing), nz = -Math.cos(ring.facing);
  const forward = dx * nx + dz * nz;
  const lateral = Math.hypot(dx - nx * forward, dz - nz * forward);
  const vertical = Math.abs(plane.alt - ring.y);
  const dist = Math.hypot(lateral, vertical);
  if (prevForward < 0 && forward >= 0 && dist < PLANE.ringRadius + 6) {
    ring.passed = true;
    ring.centreHit = dist < PLANE.ringRadius * 0.55;
    plane.ringsPassed += 1;
    if (ring.centreHit) plane.centreHits += 1;
    return ring.centreHit ? 'ring-centre' : 'ring';
  }
  return null;
}

export function planeForwardToRing(plane, ring) {
  const dx = plane.x - ring.x, dz = plane.z - ring.z;
  const nx = Math.sin(ring.facing), nz = -Math.cos(ring.facing);
  return dx * nx + dz * nz;
}
