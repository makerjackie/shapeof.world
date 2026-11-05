// Dump the UI's sound events (FILM.ctx.ui.events()) and the cut to public/audio/events.json for tools/sound.py.
//   node tools/events.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, serve, launch, openFilm } from './env.mjs';
const srv = await serve();
const browser = await launch();
try {
  const { page, errors } = await openFilm(browser, srv.url, 'scale=0.25');
  const out = await page.evaluate(() => ({
    events: (window.FILM.ctx.ui.events ? window.FILM.ctx.ui.events() : []),
    cues: window.FILM.CUES, shots: window.FILM.SHOTS.map((s) => ({ id: s.id, name: s.name, start: s.start, end: s.end })),
  }));
  const f = path.join(ROOT, 'public/audio/events.json');
  fs.writeFileSync(f, JSON.stringify(out, null, 1));
  const by = {};
  for (const e of out.events) by[e.type] = (by[e.type] || 0) + 1;
  console.log('wrote', path.relative(ROOT, f), out.events.length, 'events', JSON.stringify(by));
  if (errors.length) console.log(errors.slice(0, 10).join('\n'));
} finally { await browser.close(); srv.close(); }
