// Print robot anchor positions at given film times (for framing shots).
//   node tools/probe.mjs 6 14 26 perchL roofR visor
import { serve, launch, openFilm } from './env.mjs';

const args = process.argv.slice(2);
const times = args.filter((a) => !isNaN(parseFloat(a))).map(Number);
const names = args.filter((a) => isNaN(parseFloat(a)));
const srv = await serve();
const browser = await launch();
try {
  const { page } = await openFilm(browser, srv.url, 'scale=0.25');
  const out = await page.evaluate((times, names) => {
    const F = window.FILM, rows = [];
    for (const t of times) {
      F.renderFrame(Math.round(t * F.FPS));
      const r = F.ctx.robot, row = { t };
      for (const n of names) { const p = r.anchor(n); row[n] = [p.x, p.y, p.z].map((x) => +x.toFixed(2)); }
      rows.push(row);
    }
    return rows;
  }, times, names);
  for (const row of out) console.log(JSON.stringify(row));
} finally {
  await browser.close();
  srv.close();
}
