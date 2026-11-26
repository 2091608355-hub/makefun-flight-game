// Skylark Courier — tuning, palettes and mission definitions.
// All distances are metres, all speeds metres per second, angles radians.
// Display converts to feet / knots / degrees in the HUD.

export const VIEW = { width: 1280, height: 720, focal: 560 };

export const PLANE = {
  stallSpeed: 30,
  minSpeed: 18,
  cruiseSpeed: 62,
  maxSpeed: 88,
  accel: 14,
  drag: 0.55,
  maxBank: 0.95,
  bankRate: 2.4,
  maxPitch: 0.36,
  pitchRate: 1.5,
  sinkRate: 9,
  fuelBurnIdle: 0.10,
  fuelBurnFull: 0.55,
  ringRadius: 30,
  safeLandingVSpeed: 4.5,
  hardLandingVSpeed: 7.5,
  safeLandingSpeed: 46,
  runwayAlign: 0.45,
};

export const PALETTES = {
  day: {
    name: 'First Light',
    skyTop: '#2f6fb4', skyMid: '#7fb2dd', skyLow: '#cfe8f5',
    horizonGlow: '#ffe9b8', sun: '#fff3c4', sunCore: '#ffffff',
    seaFar: '#3f7fae', seaNear: '#1d4e74', seaGlitter: '#ffe9a8',
    islandGrass: '#5d9b4a', islandSand: '#e8d9a0', islandRock: '#7a6a58',
    mountain: '#5b6f8e', mountainFar: '#8aa3c2',
    cloud: '#ffffff', ring: '#ffd23e', ringNext: '#37e0a0',
    panel: '#20262e', panelEdge: '#3a454f',
  },
  dusk: {
    name: 'Dusk',
    skyTop: '#2b2350', skyMid: '#b45a7a', skyLow: '#ff9e5e',
    horizonGlow: '#ffb36b', sun: '#ffcf8a', sunCore: '#fff0c0',
    seaFar: '#6a4a7e', seaNear: '#3a2c52', seaGlitter: '#ffb36b',
    islandGrass: '#4a6b3f', islandSand: '#cbb98a', islandRock: '#5d4a42',
    mountain: '#3d3358', mountainFar: '#6b5583',
    cloud: '#f7c9d4', ring: '#ffd23e', ringNext: '#37e0a0',
    panel: '#1d1a26', panelEdge: '#38304a',
  },
};

export const ISLANDS = [
  { x: 0, z: 0, r: 720, h: 16, peak: 26, seed: 11 },
  { x: 1500, z: -1250, r: 430, h: 30, peak: 64, seed: 23 },
  { x: -1450, z: -950, r: 390, h: 42, peak: 96, seed: 37 },
  { x: 2450, z: 950, r: 510, h: 24, peak: 52, seed: 41 },
  { x: -2250, z: 1450, r: 460, h: 36, peak: 78, seed: 53 },
  { x: 850, z: 2250, r: 370, h: 20, peak: 44, seed: 67 },
  { x: -650, z: -2450, r: 310, h: 28, peak: 58, seed: 71 },
  { x: 2900, z: -2100, r: 340, h: 22, peak: 46, seed: 83 },
];

export const RUNWAY = {
  x: 210, z: 0, heading: Math.PI / 2, length: 540, width: 30, label: '09',
};

// Ring lists: {x, y (altitude), z}. y is the ring centre height above the sea.
export const MISSIONS = [
  {
    id: 'first-light',
    name: 'First Light Run',
    tag: 'Learn the sky — 6 rings, then land on runway 09',
    palette: 'day',
    fuel: 100,
    wind: 4,
    windDir: 0.6,
    rings: [
      { x: 950, y: 300, z: -150 },
      { x: 1500, y: 340, z: -800 },
      { x: 1750, y: 380, z: -1400 },
      { x: 900, y: 330, z: -1900 },
      { x: -100, y: 300, z: -1500 },
      { x: -500, y: 280, z: -600 },
    ],
    parSeconds: 150,
  },
  {
    id: 'island-mail',
    name: 'Island Mail',
    tag: 'Eight stops, gusty crosswind — mind the fuel gauge',
    palette: 'day',
    fuel: 88,
    wind: 9,
    windDir: 2.2,
    gusts: true,
    rings: [
      { x: 950, y: 300, z: -150 },
      { x: 1500, y: 360, z: -1250 },
      { x: 2450, y: 320, z: 300 },
      { x: 2200, y: 380, z: 1200 },
      { x: 850, y: 300, z: 2250 },
      { x: -900, y: 340, z: 1800 },
      { x: -2250, y: 360, z: 1000 },
      { x: -1450, y: 300, z: -400 },
    ],
    parSeconds: 210,
  },
  {
    id: 'dusk-landing',
    name: 'Dusk Landing',
    tag: 'Four rings at sunset, low fuel — bring her home gentle',
    palette: 'dusk',
    fuel: 72,
    wind: 6,
    windDir: 4.4,
    rings: [
      { x: 950, y: 280, z: -150 },
      { x: 1300, y: 320, z: -900 },
      { x: 600, y: 300, z: -1600 },
      { x: -300, y: 260, z: -900 },
    ],
    parSeconds: 150,
  },
];

export const SCORE = { ring: 250, ringCentre: 100, landing: 400, timeBonus: 5, fuelBonus: 6 };
