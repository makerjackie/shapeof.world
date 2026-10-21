import { TIMELINE } from "./timeline.js";
import { C, W, H, txt, rule, rect, clamp } from "./lib/engine.js";
import { scenes } from "./scenes/index.js";
import { markReady } from "./lib/assets.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d", { alpha: false });
canvas.width = W;
canvas.height = H;

const byId = new Map(scenes.map((s) => [s.id, s]));
const chapters = TIMELINE.scenes.filter((s) => s.id !== "outro");
const coverMode = new URLSearchParams(location.search).has("cover");

function drawChrome(t, index) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  txt(ctx, "世界的形状", 108, 62, { size: 26, weight: 600, color: C.paper, spacing: 0.5 });
  txt(ctx, "SHAPE OF THE WORLD", 258, 61, { size: 16, family: "mono", color: C.mute, spacing: 4 });
  txt(ctx, `${String(index + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`, W - 108, 61, {
    size: 16, family: "mono", color: C.mute, align: "right", spacing: 3,
  });
  rule(ctx, 108, 82, W - 108, 82, C.line, 1, 0.7);
  ctx.restore();

  const x0 = 108, x1 = W - 108, y = H - 38, gap = 8;
  const segW = (x1 - x0 - gap * (chapters.length - 1)) / chapters.length;
  chapters.forEach((s, i) => {
    const x = x0 + i * (segW + gap);
    rect(ctx, x, y, segW, 3, i < index ? C.paperDim : i === index ? C.lime : C.dim, 2);
  });
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  txt(ctx, `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`, x0, y + 24, {
    size: 15, family: "mono", color: C.mute, spacing: 2,
  });
  txt(ctx, "DEEPINFER", x1, y + 24, { size: 15, family: "mono", color: C.mute, align: "right", spacing: 3 });
}

function seek(t) {
  t = clamp(t, 0, TIMELINE.total);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const index = Math.max(0, TIMELINE.scenes.findIndex((s) => t >= s.start && t < s.end));
  const scene = TIMELINE.scenes[index];
  const local = t - scene.start;
  const punch = 1.055 - 0.055 * clamp(local / 0.24);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(punch, punch);
  ctx.translate(-W / 2, -H / 2);
  const mod = byId.get(scene.id);
  if (mod) mod.draw(ctx, local, { ...scene, index, total: TIMELINE.total, timeline: TIMELINE });
  ctx.restore();

  if (scene.id !== "outro" && scene.id !== "hook" && local < 0.07) {
    ctx.save();
    ctx.globalAlpha = (1 - local / 0.07) * 0.2;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // A thin lime cut-line on every scene entry.
  if (scene.id !== "outro" && scene.id !== "hook" && local < 0.16) {
    const p = clamp(local / 0.16);
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.8;
    ctx.fillStyle = C.lime;
    ctx.fillRect(0, 0, W * (1 - p), 4);
    ctx.restore();
  }

  if (scene.id !== "outro" && !coverMode) drawChrome(t, index);

  const fade = clamp((t - (TIMELINE.total - 0.5)) / 0.5);
  if (fade > 0) {
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

window.__film = { seek, duration: TIMELINE.total, fps: TIMELINE.fps, width: W, height: H, ready: markReady };
seek(Number(new URLSearchParams(location.search).get("t") ?? 0));
