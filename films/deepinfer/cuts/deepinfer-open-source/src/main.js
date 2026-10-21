import { TIMELINE } from "./generated/timeline.js";
import { C, W, H, txt, rule, rect, easeOut, clamp, at, font, wrap, measure } from "./lib/engine.js";
import { scenes } from "./scenes/index.js";
import { markReady } from "./lib/assets.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d", { alpha: false });
canvas.width = W;
canvas.height = H;

const byId = new Map(scenes.map((s) => [s.id, s]));
const coverMode = new URLSearchParams(location.search).has("cover");
const videoDuration = TIMELINE.total;
const flashScenes = new Set(["hook", "war", "open", "inside", "limits", "close"]);

// ---------- captions ----------
function expandWords(words) {
  const out = [];
  for (const w of words) {
    const chars = [...w.w];
    const span = Math.max(0.001, w.e - w.s);
    chars.forEach((ch, i) => out.push({ ch, s: w.s + (span * i) / chars.length, e: w.s + (span * (i + 1)) / chars.length }));
  }
  return out;
}

function chunkText(text, max = 30, min = 14) {
  const chars = [...text];
  const chunks = [];
  let line = "";
  for (const ch of chars) {
    line += ch;
    const n = [...line].length;
    const hard = /[。！？]/.test(ch);
    const soft = /[，、；：]/.test(ch) && n >= min;
    if (hard || soft) { chunks.push(line); line = ""; continue; }
    if (n >= max) { chunks.push(line); line = ""; }
  }
  if (line) chunks.push(line);
  return chunks;
}

function buildCues(scene) {
  const chunks = chunkText(scene.text);
  const chars = expandWords(scene.words ?? []);
  const joined = chars.map((c) => c.ch).join("");
  let pos = 0;
  const cues = chunks.map((text) => {
    const clean = [...text].filter((c) => !/\s/.test(c)).join("");
    let idx = joined.indexOf(clean.slice(0, Math.min(5, clean.length)), pos);
    if (idx < 0) idx = pos;
    const slice = chars.slice(idx, idx + clean.length);
    pos = idx + Math.max(1, clean.length);
    const start = slice.length ? scene.voStart + slice[0].s : scene.voStart;
    const end = slice.length ? scene.voStart + slice.at(-1).e : scene.voStart + 1;
    return { text, start: start - 0.04, end: Math.max(start + 0.55, end + 0.12) };
  });
  // Keep captions on screen through tiny breath gaps.
  for (let i = 0; i < cues.length - 1; i++) {
    if (cues[i + 1].start - cues[i].end < 0.4) cues[i].end = cues[i + 1].start - 0.02;
  }
  const units = (s) => s.replace(/\s+/g, "").replace(/[0-9.,%+\-−–≈]+/g, "#").length;
  const need = (s) => Math.max(1.2, 0.5 + 0.12 * units(s));
  const merged = [];
  for (const c of cues) {
    const prev = merged.at(-1);
    const prevDur = prev ? prev.end - prev.start : 0;
    if (prev && c.start - prev.end < 0.38 && [...(prev.text + c.text)].length <= 34 && prevDur < need(prev.text) + 0.2) {
      prev.text += c.text;
      prev.end = c.end;
    } else merged.push({ ...c });
  }
  if (merged.length) merged.at(-1).end = Math.max(merged.at(-1).end, scene.end - 0.18);
  return merged;
}

const cueMap = new Map(
  TIMELINE.scenes.map((s) => {
    const vo = JSON.parse(JSON.stringify(s));
    return [s.id, buildCues(vo)];
  })
);

function drawCaption(t) {
  const scene = TIMELINE.scenes.find((s) => t >= s.start && t < s.end);
  if (!scene) return;
  const cues = cueMap.get(scene.id) || [];
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return;
  const fade = Math.min(clamp((t - cue.start) / 0.12), clamp((cue.end - t) / 0.12));
  const y = 1585;
  ctx.save();
  ctx.globalAlpha = fade;
  font(ctx, 46, { weight: 600, family: "sans" });
  const lines = wrap(ctx, cue.text, 900, 46, { weight: 600, family: "sans" });
  const lh = 60;
  const top = y - (lines.length - 1) * lh;
  // A soft dark plate keeps text readable over busy diagrams.
  const plate = ctx.createLinearGradient(0, top - 56, 0, top + (lines.length - 1) * lh + 40);
  plate.addColorStop(0, "rgba(5,8,9,0)");
  plate.addColorStop(0.45, "rgba(5,8,9,0.55)");
  plate.addColorStop(1, "rgba(5,8,9,0)");
  ctx.fillStyle = plate;
  ctx.fillRect(40, top - 56, W - 80, (lines.length - 1) * lh + 110);
  lines.forEach((line, i) => {
    txt(ctx, line, W / 2, top + i * lh, {
      size: 46, weight: 600, color: C.paper, align: "center", shadow: 18,
    });
  });
  ctx.restore();
}

// ---------- chrome ----------
function drawChrome(t, index) {
  ctx.save();
  const chapters = TIMELINE.scenes.filter((s) => s.id !== "outro");
  const barA = 0.5;
  ctx.globalAlpha = barA;
  txt(ctx, "世界的形状", 72, 92, { size: 28, weight: 600, color: C.paper, spacing: 0.5 });
  txt(ctx, "SHAPE OF THE WORLD", 232, 91, { size: 19, family: "mono", color: C.mute, spacing: 4 });
  const label = `${String(index + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
  txt(ctx, label, W - 72, 91, { size: 18, family: "mono", color: C.mute, align: "right", spacing: 3 });
  rule(ctx, 72, 112, W - 72, 112, C.line, 1, 0.8);
  ctx.restore();

  // progress segments
  const x0 = 72;
  const x1 = W - 72;
  const y = 1838;
  const gap = 7;
  const totalGap = gap * (chapters.length - 1);
  const segW = (x1 - x0 - totalGap) / chapters.length;
  chapters.forEach((s, i) => {
    const x = x0 + i * (segW + gap);
    let color = C.dim;
    if (i < index) color = C.paperDim;
    if (i === index) color = C.lime;
    rect(ctx, x, y, segW, 3, color, 2);
  });
  const mm = Math.floor(t / 60);
  const ss = Math.floor(t % 60);
  txt(ctx, `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`, x0, y + 38, {
    size: 18, family: "mono", color: C.mute, spacing: 2,
  });
  txt(ctx, "OPEN SOURCE / DEEPINFER", x1, y + 38, {
    size: 18, family: "mono", color: C.mute, align: "right", spacing: 2,
  });
}

function drawIntro(t) {
  if (t > TIMELINE.intro) return;
  const p = easeOut(t / TIMELINE.intro);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  txt(ctx, "SHAPE OF THE WORLD", W / 2, H / 2 - 16, {
    size: 22, family: "mono", color: C.mute, align: "center", spacing: 6, alpha: clamp(p * 2),
  });
  rule(ctx, W / 2 - 120 * p, H / 2 + 24, W / 2 + 120 * p, H / 2 + 24, C.lime, 2);
  txt(ctx, "EP.01", W / 2, H / 2 + 70, {
    size: 16, family: "mono", color: C.lime, align: "center", spacing: 5, alpha: clamp(p * 2 - 0.4),
  });
}

function seek(t) {
  t = clamp(t, 0, videoDuration);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  if (t < TIMELINE.intro) {
    drawIntro(t);
    return;
  }
  const index = Math.max(0, TIMELINE.scenes.findIndex((s) => t >= s.start && t < s.end));
  const scene = TIMELINE.scenes[index];
  const local = t - scene.start;
  const p = easeOut(local / 0.5);
  const zoom = scene.id === "close" ? 1.006 : 1.035 - 0.02 * p;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
  const mod = byId.get(scene.id);
  if (mod) mod.draw(ctx, local, { ...scene, index, total: videoDuration, timeline: TIMELINE });
  ctx.restore();

  if (flashScenes.has(scene.id) && local < 0.09) {
    ctx.save();
    ctx.globalAlpha = (1 - local / 0.09) * 0.16;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (scene.id !== "outro") {
    drawChrome(t, index);
    if (!coverMode) drawCaption(t);
  }

  const fadeOut = clamp((t - (videoDuration - 0.6)) / 0.6);
  if (fadeOut > 0) {
    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (scene.id !== "outro") {
    // scene number watermark, very quiet
    txt(ctx, String(index + 1).padStart(2, "0"), W - 64, H - 136, {
      size: 110, family: "mono", weight: 700, color: C.paper, align: "right", alpha: 0.035,
    });
  }
}

window.__film = { seek, duration: videoDuration, fps: TIMELINE.fps, width: W, height: H, ready: markReady, cues: Object.fromEntries(cueMap), cover: coverMode };
seek(Number(new URLSearchParams(location.search).get("t") ?? 0));
