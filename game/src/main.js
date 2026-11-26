// Skylark Courier — game loop, states and mission flow.
// States: menu → flying → landed / crashed, with a score card at the end.
// The loop is a fixed-step accumulator so replays and screenshots are
// stable, and the plane is only ever moved by physics.stepPlane.

import { VIEW, MISSIONS, PALETTES, RUNWAY, SCORE } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { freshPlane, placeOnRunway, stepPlane, checkRing, planeForwardToRing } from './physics.js';
import { buildRings, buildClouds } from './world.js';
import { renderWorld } from './render.js';
import { drawPanel, drawTopBar, drawBanner, drawRingPointer, drawMenu, drawEndCard } from './hud.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = createInput(canvas);
const audio = createAudio();
const clouds = buildClouds();

const game = {
  state: 'menu',
  missionIndex: 0,
  mission: MISSIONS[0],
  palette: PALETTES.day,
  plane: null,
  rings: [],
  clouds,
  time: 0,
  bestScore: 0,
  menuHover: -1,
  paused: false,
  shotMode: false,
  stallWarned: false,
  lowFuelWarned: false,
  lastWarn: 0,
};

function say(text, color, seconds = 2.2) {
  game.plane.message = text;
  game.plane.messageColor = color;
  game.plane.messageUntil = game.time + seconds;
}

function startMission(index) {
  game.missionIndex = index;
  game.mission = MISSIONS[index];
  game.palette = PALETTES[game.mission.palette];
  game.plane = freshPlane(game.mission);
  game.rings = buildRings(game.mission);
  placeOnRunway(game.plane, RUNWAY);
  game.plane.throttle = 0.55;
  game.state = 'flying';
  game.paused = false;
  game.stallWarned = false;
  game.lowFuelWarned = false;
  say(`${game.mission.name} — throttle up and lift off`, '#ffffff', 3);
  audio.unlock();
  audio.click();
}

function finishFlight(result) {
  const p = game.plane;
  if (result === 'landed') {
    const allRings = game.rings.every((r) => r.passed);
    const timeBonus = Math.max(0, Math.round((game.mission.parSeconds - p.time) * SCORE.timeBonus));
    const fuelBonus = Math.round(p.fuel * SCORE.fuelBonus);
    const landingBonus = Math.round(SCORE.landing * (1 - p.damage / 200));
    p.score += timeBonus + fuelBonus + landingBonus;
    game.endLines = [
      `Rings flown: ${p.ringsPassed} of ${game.rings.length}${allRings ? ' — every ring!' : ''}`,
      `Centre passes: ${p.centreHits}   •   Time ${Math.floor(p.time / 60)}:${String(Math.floor(p.time % 60)).padStart(2, '0')}   •   Fuel left ${Math.round(p.fuel)}%`,
      `Landing ${landingBonus}  +  time ${timeBonus}  +  fuel ${fuelBonus}  =  ${p.score} pts`,
    ];
    game.endTitle = allRings ? 'MISSION COMPLETE' : 'LANDED — MISSION DONE';
    audio.thud();
  } else {
    game.endLines = [
      `Rings flown: ${p.ringsPassed} of ${game.rings.length}   •   Score ${p.score} pts`,
      p.crashWhy === 'water' ? 'She went into the sea — keep the nose up over water.'
        : p.crashWhy === 'terrain' ? 'Terrain wins that argument — climb earlier next time.'
        : 'That touchdown was too hard — flare gently and land slow.',
      'The post brings another plane tomorrow. Fly again?',
    ];
    game.endTitle = 'CRASHED';
    audio.crash();
  }
  game.bestScore = Math.max(game.bestScore, p.score);
  game.state = result === 'landed' ? 'landed' : 'crashed';
}

function update(dt) {
  const p = game.plane;
  if (game.state !== 'flying' || game.paused) return;
  game.time += dt;

  const stick = input.stick();
  const ctl = {
    pitch: stick.pitch,
    bank: stick.bank,
    throttle: input.throttleDelta(),
    brake: input.brake(),
  };
  const nextRing = game.rings.find((r) => !r.passed);
  const prevForward = nextRing ? planeForwardToRing(p, nextRing) : 0;

  const event = stepPlane(p, ctl, game.mission, dt);

  if (nextRing) {
    const hit = checkRing(p, nextRing, prevForward);
    if (hit) {
      p.score += SCORE.ring + (hit === 'ring-centre' ? SCORE.ringCentre : 0);
      audio.ring(hit === 'ring-centre');
      say(hit === 'ring-centre'
        ? `RING ${p.ringsPassed} — DEAD CENTRE! +${SCORE.ring + SCORE.ringCentre}`
        : `RING ${p.ringsPassed} — +${SCORE.ring}`, '#37e0a0');
      const following = game.rings.find((r) => !r.passed);
      if (!following) say('All rings flown — land on runway 09!', '#ffd23e', 3);
    }
  }

  if (event === 'takeoff') say('Airborne — gear up, enjoy the islands', '#ffffff');
  if (event === 'bounced') {
    say('Hard touchdown! Damage taken — she still flies', '#ffb03a');
    audio.thud();
  }
  if (event === 'landed') { finishFlight('landed'); return; }
  if (event === 'crashed') { finishFlight('crashed'); return; }
  if (event === 'stall' && !game.stallWarned) {
    game.stallWarned = true;
    say('STALL — nose down, throttle up!', '#ff5a4e');
  }
  if (p.speed > 40) game.stallWarned = false;

  if (p.fuel < 20 && !game.lowFuelWarned) {
    game.lowFuelWarned = true;
    say('LOW FUEL — head for runway 09', '#ffb03a', 3);
  }
  if (p.fuel <= 0.5) say('FUEL EMPTY — gliding, find the runway', '#ff5a4e', 1.2);

  if (game.time - game.lastWarn > 1.1) {
    game.lastWarn = game.time;
    if (p.airborne && p.alt < 45 && p.vspeed < -1) audio.warning();
  }

  audio.engine(p.throttle, p.speed, p.airborne);
}

function render() {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (game.state === 'menu') {
    // Menu backdrop: the plane parked on the runway at first light.
    renderWorld(ctx, game);
    drawMenu(ctx, game);
    return;
  }
  renderWorld(ctx, game);
  drawTopBar(ctx, game);
  drawPanel(ctx, game);
  drawRingPointer(ctx, game);
  drawBanner(ctx, game);
  if (game.state === 'landed' || game.state === 'crashed') {
    drawEndCard(ctx, game, game.endTitle, game.endLines);
  }
  if (game.paused && !game.shotMode) {
    ctx.fillStyle = 'rgba(8, 14, 22, 0.5)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED — press P to fly on', VIEW.width / 2, VIEW.height / 2);
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.shotMode) {
    acc += dt;
    while (acc >= 1 / 60) {
      update(1 / 60);
      acc -= 1 / 60;
    }
  }
  render();
  requestAnimationFrame(frame);
}

// Menu mouse: hover a mission card, click to fly it.
canvas.addEventListener('pointermove', (e) => {
  if (game.state !== 'menu') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * VIEW.width;
  const y = (e.clientY - rect.top) / rect.height * VIEW.height;
  game.menuHover = -1;
  for (let i = 0; i < 3; i += 1) {
    if (x >= 190 + i * 310 && x <= 470 + i * 310 && y >= 220 && y <= 430) game.menuHover = i;
  }
});
canvas.addEventListener('click', () => {
  audio.unlock();
  if (game.state === 'menu' && game.menuHover >= 0) startMission(game.menuHover);
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  audio.unlock();
  if (k === 'm') { audio.setMuted(!audio.isMuted()); return; }
  if (k === 'p' && game.state === 'flying') { game.paused = !game.paused; return; }
  if (k === 'r' && game.state !== 'menu') { startMission(game.missionIndex); return; }
  if (game.state === 'menu' && ['1', '2', '3'].includes(k)) { startMission(Number(k) - 1); return; }
  if ((game.state === 'landed' || game.state === 'crashed') && ['1', '2', '3'].includes(k)) {
    startMission(Number(k) - 1);
  }
});

// Parked plane behind the menu, so the title screen is the game itself.
game.plane = freshPlane(MISSIONS[0]);
game.rings = buildRings(MISSIONS[0]);
placeOnRunway(game.plane, RUNWAY);
game.plane.throttle = 0;
game.palette = PALETTES.day;

// Screenshot poses (?shot=start|play|approach|end) freeze a real game
// state — no composited images, the canvas draws every pixel.
const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  game.shotMode = true;
  applyShot(game, params.get('shot'), startMission, say);
}

requestAnimationFrame(frame);

// Exposed for play-testing: read-only state for the console.
window.__skylark = game;
