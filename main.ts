// Skylark Courier — hand-in program (make.fun program/v1).
// Copies game/ and screenshots/ from this repository into /output and
// writes /output/dossier.json with buildDossier from the kit's library.
// Node 22 standard library only; no network, no installs, deterministic:
// two runs write the same bytes.

import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Guardrails the gate checks anyway, caught here first with a plain
// error instead of a silent bad entry: the game must open at index.html,
// and the screenshots must be 3 or 4 real images inside their size cap.
function checkHandIn(outDir: string): void {
  const index = join(outDir, 'game', 'index.html');
  const indexSize = statSync(index).size;
  if (indexSize > 1024 * 1024) throw new Error(`game/index.html is ${indexSize} bytes, over the 1 MiB cap`);
  const shots = readdirSync(join(outDir, 'screenshots')).filter((n) => !n.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  }
  for (const name of shots) {
    const size = statSync(join(outDir, 'screenshots', name)).size;
    if (size > 262144) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
    if (!/\.(png|jpg|jpeg)$/i.test(name)) throw new Error(`screenshots/${name} is not a PNG or JPEG`);
  }
}

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

mkdirSync(join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

checkHandIn(outDir);

const dossier = buildDossier(outDir, caps);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Skylark Courier: dossier written (${dossier.length} bytes) to ${outDir}/dossier.json`);
