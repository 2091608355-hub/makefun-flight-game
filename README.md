# Skylark Courier — Island Air Mail

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/2091608355-hub/makefun-flight-game/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/2091608355-hub/makefun-flight-game/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A complete little flight game for the [make.fun best flight game bounty](https://make.fun/c/best-flight-game-20261126-0057). Fly the SK-07 courier plane around a chain of islands, thread the glowing rings, watch the fuel gauge, and bring her home onto runway 09.

## Play it

Open `game/index.html` in a desktop browser, or serve the `game/` folder with any static server:

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network requests, no libraries — just the files under `game/`. Sounds are synthesised in the browser, so there are no audio files either.

## How to fly

- **Arrow keys** — pitch and bank (Up/Down pitch, Left/Right bank)
- **W / S** — throttle up / down (Shift / Ctrl trim it fast)
- **B** — brake · **P** — pause · **M** — mute · **R** — restart
- **Mouse** — hold and drag to steer

## Missions

1. **First Light Run** — 6 rings, then land on runway 09. Learn the sky.
2. **Island Mail** — 8 rings in gusty crosswind. Mind the fuel gauge.
3. **Dusk Landing** — 4 rings at sunset on low fuel. Bring her home gentle.

Rings pay 250 points (100 extra for a dead-centre pass). Landing pays for softness, leftover time and fuel. A hard touchdown costs damage; the sea costs the plane.

## What is in the repo

- `game/` — the playable game (static files only)
  - `index.html`, `src/style.css`
  - `src/config.js` — tuning, palettes, missions
  - `src/random.js` — seeded random helpers
  - `src/world.js` — islands, runway, rings, clouds
  - `src/physics.js` — the flight model
  - `src/input.js` — keyboard and mouse
  - `src/audio.js` — synthesised engine, wind and chimes
  - `src/render.js` — sky, sea, terrain, rings and the plane
  - `src/hud.js` — instruments, HUD, menus and score cards
  - `src/shots.js` — deterministic screenshot poses
  - `src/main.js` — game loop and mission flow
- `screenshots/` — 4 real renders of the game (cover first)
- `main.ts` — the make.fun hand-in program (Node 22, standard library only)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `serve.ts` — tiny static server for local play-testing

## License

MIT — see `LICENSE`.
