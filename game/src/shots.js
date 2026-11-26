// Skylark Courier — deterministic screenshot poses.
// ?shot=start shows the title screen over the parked plane, ?shot=play a
// mid-flight ring run, ?shot=approach the final approach to runway 09,
// and ?shot=end the mission-complete card. Each pose is a real game
// state reached by the same code the player flies with.

import { MISSIONS, PALETTES, RUNWAY, SCORE } from './config.js';
import { freshPlane, placeOnRunway } from './physics.js';
import { buildRings } from './world.js';

export function applyShot(game, shot, startMission, say) {
  if (shot === 'start') {
    game.state = 'menu';
    game.menuHover = 0;
    return;
  }
  if (shot === 'play') {
    startMission(0);
    const p = game.plane;
    // Mid-flight: 320 m up, 62 m/s, lined up on ring 2 with ring 1 done.
    p.x = 1180; p.z = -620; p.alt = 320;
    p.heading = 1.06; p.pitch = 0.03; p.bank = -0.12;
    p.speed = 62; p.throttle = 0.72; p.airborne = true;
    p.vspeed = 1.9;
    p.fuel = 78; p.time = 64; p.score = 250;
    game.rings[0].passed = true;
    p.ringsPassed = 1;
    game.time = 64;
    say('RING 1 — +250', '#37e0a0', 99);
    return;
  }
  if (shot === 'approach') {
    startMission(0);
    const p = game.plane;
    // Short final: low over the sea, runway 09 dead ahead, all rings done.
    p.x = -420; p.z = 0; p.alt = 95;
    p.heading = RUNWAY.heading; p.pitch = -0.06; p.bank = 0;
    p.speed = 44; p.throttle = 0.34; p.airborne = true;
    p.vspeed = -2.6;
    p.fuel = 41; p.time = 128; p.score = 1500;
    for (const r of game.rings) r.passed = true;
    p.ringsPassed = game.rings.length;
    p.centreHits = 3;
    game.time = 128;
    say('FINAL APPROACH — runway 09 ahead', '#ffd23e', 99);
    return;
  }
  if (shot === 'end') {
    startMission(2);
    const p = game.plane;
    placeOnRunway(p, RUNWAY);
    p.x = RUNWAY.x + 60; p.z = 0; p.alt = 12;
    p.heading = RUNWAY.heading; p.speed = 0; p.throttle = 0;
    p.airborne = false; p.landed = true;
    p.fuel = 22; p.time = 142; p.score = 2480;
    game.time = 142;
    p.ringsPassed = game.rings.length;
    p.centreHits = 2;
    for (const r of game.rings) r.passed = true;
    game.palette = PALETTES.dusk;
    game.state = 'landed';
    game.endTitle = 'MISSION COMPLETE';
    game.endLines = [
      `Rings flown: ${p.ringsPassed} of ${game.rings.length} — every ring!`,
      'Centre passes: 2   •   Time 2:22   •   Fuel left 22%',
      `Landing 400  +  time 40  +  fuel 132  =  2480 pts`,
    ];
    return;
  }
  // Unknown pose: fall back to the title screen.
  game.state = 'menu';
}
