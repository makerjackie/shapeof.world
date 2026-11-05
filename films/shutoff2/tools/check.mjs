// Quick load check: open the film page, wait up to N seconds, print console
// errors and whether FILM became ready.   node tools/check.mjs [seconds] [query]
import { serve, launch } from './env.mjs';

const secs = parseFloat(process.argv[2] ?? '30');
const query = process.argv[3] ?? '';
const srv = await serve();
const browser = await launch();
try {
  const page = await browser.newPage();
  const log = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
  await page.goto(`${srv.url}/index.html?headless=1&scale=1&${query}`, { waitUntil: 'load', timeout: secs * 1000 });
  const ready = await page.waitForFunction('window.FILM_READY === true', { timeout: secs * 1000 }).then(() => true, () => false);
  console.log('ready:', ready);
  console.log(log.filter((l) => !l.includes('favicon')).join('\n') || '(no errors)');
} finally {
  await browser.close();
  srv.close();
}
