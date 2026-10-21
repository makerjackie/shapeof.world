// Composite the MakerJackie credit line onto the untouched brand masters.
// Run from the repository root (uses the repository's Playwright, ffmpeg and ffprobe):
//   node scripts/brand-credit/render.mjs output/shape-video/brand-credit-<date>
// Writes brand-credit-{zh,en}.mp4 (1080x1920) and brand-credit-{zh,en}-16x9.mp4 (1920x1080),
// a WebP still of each, and manifest.json. Existing output is never overwritten. Review the stills
// and videos, then copy the MP4s to public/assets/brand/outro/ and the manifest next to this script.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

const here = dirname(fileURLToPath(import.meta.url));
const repo = process.cwd();
if (!existsSync(join(repo, 'public/assets/brand/outro/brand-zh.mp4'))) throw Error('Run from the repository root');
const { chromium } = createRequire(resolve(repo, 'package.json'))('playwright');
const [outArg] = process.argv.slice(2);
if (!outArg) throw Error('Usage: node render.mjs <new-output-directory>');
const out = resolve(outArg);
if (existsSync(out)) throw Error(`Output directory exists; choose a new one: ${out}`);
mkdirSync(out, { recursive: true });

const config = JSON.parse(readFileSync(join(here, 'credit.json'), 'utf8'));
const { fps, frames, layout } = config;
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw Error(`${cmd} failed: ${r.stderr}`);
  return r.stdout + r.stderr;
};
const probe = file => JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]));
const decode = file => run('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
const psnr = (file, master, filter, height) => {
  const log = run('ffmpeg', ['-hide_banner', '-i', file, '-i', master, '-filter_complex', `[1:v]${filter},crop=iw:${height}:0:0[m];[0:v]crop=iw:${height}:0:0[a];[a][m]psnr`, '-f', 'null', '-']);
  const match = log.match(/PSNR .*average:([\d.]+|inf)/);
  if (!match) throw Error('PSNR not reported');
  return match[1] === 'inf' ? Infinity : Number(match[1]);
};
// Mean luma of an empty patch above the orb (master x 440..640, y 440..520) on the last frame,
// given in output coordinates; `filter` maps the master into the output frame first.
const backgroundLuma = (file, x, y, filter = 'null') => {
  const log = run('ffmpeg', ['-v', 'error', '-i', file, '-vf', `${filter},select=eq(n\\,${frames - 1}),crop=200:80:${x}:${y},signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`, '-f', 'null', '-']);
  const match = log.match(/YAVG=([\d.]+)/);
  if (!match) throw Error('Luma not reported');
  return Number(match[1]);
};

const browser = await chromium.launch();
const manifest = { version: config.version, decidedAt: config.decidedAt, fps, frames, seconds: frames / fps, audio: 'none', config: sha256(join(here, 'credit.json')), template: sha256(join(here, 'credit.html')), videos: [] };
try {
  const converter = await browser.newPage();
  for (const [lang, strings] of Object.entries(config.locales)) {
    const master = resolve(repo, config.master.replace('{lang}', lang));
    const source = probe(master);
    const sourceVideo = source.streams.find(s => s.codec_type === 'video');
    if (source.streams.length !== 1 || sourceVideo.width !== 1080 || sourceVideo.height !== 1920 || sourceVideo.r_frame_rate !== `${fps}/1` || Number(sourceVideo.nb_read_frames) !== frames) throw Error(`Unexpected brand master: ${master}`);
    decode(master);

    for (const [aspect, output] of Object.entries(config.outputs)) {
      const page = await browser.newPage({ viewport: { width: output.width, height: output.height }, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(join(here, 'credit.html')).href);
      const box = await page.evaluate(options => window.setupCredit(options), { lang, width: output.width, height: output.height, centerY: layout.centerY + output.offsetY, strings, layout, motion: config.motion });
      // Check in master (9:16) coordinates: below the brand lockup and inside the 16:9 crop square.
      const top = box.y - output.offsetY, bottom = top + box.h, left = box.x - (output.width - 1080) / 2;
      if (top < layout.brandBottom + layout.minGap || bottom > 1500 - 60 || left < 60 || left + box.w > 1080 - 60) throw Error(`Credit outside its safe area: ${JSON.stringify(box)}`);

      const base = `brand-credit-${lang}${output.suffix}`;
      const file = join(out, `${base}.mp4`);
      const encoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-xerror', '-n', '-i', master, '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
        // Composite in YUV 4:2:0: an RGB round trip would shift the master's background by one luma level.
        '-filter_complex', `[0:v]${output.masterFilter},format=yuv420p,setpts=PTS-STARTPTS[base];[1:v]format=yuva420p,setpts=PTS-STARTPTS[ov];[base][ov]overlay=0:0:eof_action=pass:format=yuv420,format=yuv420p[v]`,
        '-map', '[v]', '-an', '-frames:v', String(frames), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), '-video_track_timescale', '15360', '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'inherit'] });
      const done = once(encoder, 'close');
      encoder.stdin.on('error', () => {});
      for (let f = 0; f < frames; f++) {
        await page.evaluate(t => window.renderAt(t), f / fps);
        const png = await page.screenshot({ type: 'png', omitBackground: true });
        if (!encoder.stdin.write(png)) await Promise.race([once(encoder.stdin, 'drain'), done]);
      }
      encoder.stdin.end();
      const [code] = await done;
      await page.close();
      if (code !== 0) throw Error(`ffmpeg failed for ${file}`);

      decode(file);
      const info = probe(file);
      const video = info.streams.find(s => s.codec_type === 'video');
      if (info.streams.length !== 1 || video.width !== output.width || video.height !== output.height || video.r_frame_rate !== `${fps}/1` || Number(video.nb_read_frames) !== frames || Math.abs(Number(info.format.duration) - frames / fps) > 0.01) throw Error(`Unexpected output stream: ${file}`);
      // The brand lockup above the credit must be the master's pixels (only re-encoding differs).
      const untouched = Math.floor(box.y) - 24;
      const brandPsnr = psnr(file, master, output.masterFilter, untouched - (untouched % 2));
      if (brandPsnr < 48) throw Error(`Brand region changed (PSNR ${brandPsnr})`);
      const [px, py] = [440 + (output.width - 1080) / 2, 440 + output.offsetY];
      const lumaShift = Math.abs(backgroundLuma(file, px, py) - backgroundLuma(master, px, py, output.masterFilter));
      if (lumaShift > 0.25) throw Error(`Background luma shifted by ${lumaShift}`);

      const png = join(out, `${base}.png`);
      run('ffmpeg', ['-v', 'error', '-n', '-i', file, '-vf', `select=eq(n\\,${frames - 1})`, '-frames:v', '1', png]);
      const webp = await converter.evaluate(async data => {
        const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return canvas.toDataURL('image/webp', 0.92).split(',')[1];
      }, readFileSync(png).toString('base64'));
      writeFileSync(join(out, `${base}.webp`), Buffer.from(webp, 'base64'));
      unlinkSync(png);

      manifest.videos.push({ file: `${base}.mp4`, lang, aspect, width: output.width, height: output.height, frames, seconds: Number(info.format.duration), bytes: statSync(file).size, sha256: sha256(file), master: { file: config.master.replace('{lang}', lang), sha256: sha256(master) }, credit: { text: `${strings.label} ${strings.name}`, box }, brandRegionPsnr: brandPsnr });
      console.log(`${base}.mp4 ${statSync(file).size} bytes, brand PSNR ${brandPsnr}`);
    }
  }
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally {
  await browser.close();
}
