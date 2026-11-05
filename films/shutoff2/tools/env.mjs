// Shared tooling: static server + headless Chrome with the GPU enabled.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// puppeteer-core comes from this project's node_modules (npm install). On Windows,
// deep project paths can hit MAX_PATH: install it elsewhere and point TOOLS_DIR there.
const TOOLS = process.env.TOOLS_DIR || ROOT;
const require = createRequire(path.join(TOOLS, 'package.json'));
export const puppeteer = require('puppeteer-core');
const CHROME_DEFAULTS = {
  win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
};
export const CHROME = process.env.CHROME || CHROME_DEFAULTS[process.platform] || CHROME_DEFAULTS.linux;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.css': 'text/css' };

export function serve(root = ROOT) {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(root, p === '/' ? 'index.html' : p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}

export async function launch() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 1200000,
    args: [process.platform === 'darwin' ? '--use-angle=metal' : '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-gpu-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'],
    defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
  });
}

// Opens the film page headless and waits until FILM is ready.
export async function openFilm(browser, base, query = '') {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(`${base}/index.html?headless=1&${query}`, { waitUntil: 'load', timeout: 600000 });
  await page.waitForFunction('window.FILM_READY === true', { timeout: 600000 }).catch(() => {});
  return { page, errors };
}
