// The site's JavaScript against a budget, gzipped, as a visitor downloads it.
// CI runs this after the build (.github/workflows/ci.yml) and fails if a
// budget is broken, so a change can't quietly make the page slower to start:
// `page` is what every visitor loads before anything else (the HUD and
// React), `scene` the 3D (three.js, r3f and drei, the glow passes, the
// scene's own code), which phones and laptops load on top.
//
// The budgets sit a few percent above what the site weighs now. When a
// change really needs more, raise the budget in the same commit, so the
// growth is a decision rather than an accident.
// usage: node scripts/size-budget.mjs  (after `npm run build`)
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGETS = {
  page: { kb: 64, chunks: [/^index-/, /^vendor-/] },
  scene: { kb: 305, chunks: [/^three-/, /^r3f-/, /^postfx-/, /^Scene-/, /^stations-/] },
};

const files = readdirSync('docs/assets').filter((f) => f.endsWith('.js'));
const gz = (f) => gzipSync(readFileSync(`docs/assets/${f}`), { level: 9 }).length / 1024;

let over = false;
for (const [name, { kb, chunks }] of Object.entries(BUDGETS)) {
  const mine = files.filter((f) => chunks.some((c) => c.test(f)));
  const sizes = mine.map((f) => [f, gz(f)]);
  const total = sizes.reduce((a, [, s]) => a + s, 0);
  const ok = total <= kb;
  over ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${name}: ${total.toFixed(1)} kB of ${kb} kB gzipped`);
  for (const [f, s] of sizes) console.log(`       ${s.toFixed(1).padStart(6)} kB  ${f}`);
}
if (over) {
  console.error('A JavaScript budget is broken: see scripts/size-budget.mjs.');
  process.exit(1);
}
