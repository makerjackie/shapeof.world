import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow, measure } from "../lib/engine.js";
import { backdrop, label, check, flow, wire } from "../lib/parts.js";

const TILES = [
  { id: "kernels", cn: "高性能算子", en: "KERNELS", note: "算得更快的零件", at: 0.7 },
  { id: "parallel", cn: "分布式推理", en: "PARALLEL", note: "很多卡，像一张卡", at: 1.8 },
  { id: "spec", cn: "推测解码", en: "SPECULATIVE", note: "先猜，再验", at: 2.9 },
  { id: "async", cn: "异步调度", en: "SCHEDULER", note: "不让任何人干等", at: 4.0 },
  { id: "struct", cn: "结构化输出", en: "STRUCTURED", note: "直接给出可用的格式", at: 4.9 },
  { id: "hardware", cn: "双硬件", en: "HARDWARE", note: "英伟达 / 昇腾", at: 6.1 },
];

export default {
  id: "inside",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.09)", gx: 0.5, gy: 0.3, gridStep: 72 });
    label(ctx, "拆开看 / WHAT'S INSIDE", 90, 205, { size: 20, color: C.lime });
    txt(ctx, "引擎里，装了六样东西。", 90, 282, {
      size: 44, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35),
    });

    // Ghost the full grid first so the frame never feels empty.
    TILES.forEach((tile, i) => {
      const x = 78 + (i % 2) * 462;
      const y = 350 + Math.floor(i / 2) * 274;
      ctx.save();
      ctx.globalAlpha = 0.13;
      rect(ctx, x, y, 438, 250, "rgba(14,22,24,0.7)", 14);
      outline(ctx, x, y, 438, 250, C.line, 1, 14);
      txt(ctx, String(i + 1).padStart(2, "0"), x + 20, y + 32, { size: 15, family: "mono", color: C.mute, spacing: 2 });
      txt(ctx, tile.cn, x + 20, y + 82, { size: 38, weight: 600, color: C.paper, spacing: 0.5 });
      ctx.restore();
    });

    TILES.forEach((tile, i) => {
      const p = at(t, tile.at, 0.38);
      if (p <= 0) return;
      const x = 78 + (i % 2) * 462;
      const y = 350 + Math.floor(i / 2) * 274;
      const active = p < 1 || (i < TILES.length - 1 && t > tile.at && t < TILES[i + 1].at);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(0, (1 - easeOut(p)) * 26);
      rect(ctx, x, y, 438, 250, "rgba(14,22,24,0.92)", 14);
      outline(ctx, x, y, 438, 250, active ? C.lime : C.line, active ? 2 : 1.2, 14);
      txt(ctx, String(i + 1).padStart(2, "0"), x + 20, y + 32, { size: 15, family: "mono", color: active ? C.lime : C.dim, spacing: 2 });
      txt(ctx, tile.en, x + 418, y + 32, { size: 13, family: "mono", color: C.mute, align: "right", spacing: 2 });
      txt(ctx, tile.cn, x + 20, y + 82, { size: 38, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, tile.note, x + 20, y + 224, { size: 18, color: C.mute, spacing: 0.5 });
      drawGlyph(ctx, tile.id, x + 250, y + 96, t);
      ctx.restore();
    });

    // hardware strip
    const hp = at(t, 6.35, 0.45);
    if (hp > 0) {
      ctx.save();
      ctx.globalAlpha = hp;
      rule(ctx, 90, 1216, 990, 1216, C.line, 1);
      txt(ctx, "能跑的硬件", 90, 1272, { size: 18, family: "mono", color: C.mute, spacing: 3 });
      txt(ctx, "NVIDIA SM100", 330, 1272, { size: 24, family: "mono", color: C.lime, spacing: 1 });
      txt(ctx, "华为昇腾 950", 560, 1272, { size: 24, weight: 600, color: C.cyan, spacing: 1 });
      txt(ctx, "同一套代码，两条硬件路线", 990, 1272, { size: 18, color: C.mute, align: "right", spacing: 0.5 });
      ctx.restore();
    }

    const tp = at(t, 7.2, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      rule(ctx, 90, 1320, 990, 1320, C.line, 1);
      txt(ctx, "东西很多，目标只有一个：让每张卡都忙起来。", 90, 1382, {
        size: 27, color: C.paperDim, spacing: 0.5,
      });
      ctx.restore();
    }
  },
};

function drawGlyph(ctx, id, x, y, t) {
  if (id === "kernels") {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const on = (r * 5 + c * 3) % 7 < 3;
        const ph = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + (r + c) * 0.4));
        ctx.save();
        ctx.globalAlpha = on ? ph : 0.15;
        ctx.fillStyle = on ? C.lime : C.dim;
        ctx.beginPath();
        ctx.roundRect(x + c * 20, y + r * 20, 13, 13, 3);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  if (id === "parallel") {
    const nodes = [[x + 10, y + 30], [x + 90, y + 8], [x + 90, y + 88], [x + 156, y + 46]];
    nodes.forEach((n, i) => {
      glow(ctx, n[0], n[1], 32, "rgba(201,245,109,0.25)", 0.5);
      ctx.fillStyle = C.lime;
      ctx.beginPath(); ctx.arc(n[0], n[1], 5, 0, Math.PI * 2); ctx.fill();
    });
    [[0, 1], [0, 2], [1, 3], [2, 3]].forEach(([a, b]) => {
      wire(ctx, [nodes[a], nodes[b]], { color: C.limeDim, width: 1.2, alpha: 0.5 });
    });
    flow(ctx, [nodes[0], nodes[1], nodes[3]], t, { count: 4, speed: 0.5, size: 5, color: C.lime, alpha: 0.8 });
    flow(ctx, [nodes[0], nodes[2], nodes[3]], t, { count: 4, speed: 0.7, size: 5, color: C.cyan, alpha: 0.7 });
  }
  if (id === "spec") {
    // four guessed tokens, one verification
    for (let i = 0; i < 4; i++) {
      const p = clamp((t * 1.1 - i * 0.18) % 1.4);
      ctx.save();
      ctx.globalAlpha = 0.25 + p * 0.6;
      outline(ctx, x + 8 + i * 26, y + 18, 18, 18, C.cyan, 1.4, 4);
      leafMark(ctx, x + 17 + i * 26, y + 27, C.cyan);
      ctx.restore();
    }
    txt(ctx, "?", x + 64, y + 66, { size: 26, family: "mono", color: C.cyan, alpha: 0.8 });
    check(ctx, x + 130, y + 30, 28, C.lime, 0.95);
    txt(ctx, "猜 4 个", x + 24, y + 96, { size: 15, color: C.mute, spacing: 1 });
    txt(ctx, "一次验证", x + 118, y + 96, { size: 15, color: C.lime, spacing: 1 });
    wire(ctx, [[x + 6, y + 110], [x + 180, y + 110]], { color: C.line, width: 1, alpha: 0.8 });
  }
  if (id === "async") {
    for (let i = 0; i < 4; i++) {
      const w = 60 + ((i * 31) % 60);
      const xx = x + 6 + ((i * 23) % 46);
      const yy = y + 6 + i * 25;
      rect(ctx, xx, yy, w, 12, i % 2 ? "rgba(121,221,230,0.35)" : "rgba(201,245,109,0.4)", 6);
      const p = (t * 0.6 + i * 0.22) % 1;
      ctx.fillStyle = i % 2 ? C.cyan : C.lime;
      ctx.beginPath(); ctx.arc(xx + w * p, yy + 6, 3, 0, Math.PI * 2); ctx.fill();
    }
    txt(ctx, "重叠执行", x + 6, y + 128, { size: 15, color: C.mute, spacing: 1 });
  }
  if (id === "struct") {
    txt(ctx, "{", x - 4, y + 74, { size: 92, family: "mono", color: C.lime, alpha: 0.65 });
    txt(ctx, "}", x + 152, y + 74, { size: 92, family: "mono", color: C.lime, alpha: 0.65 });
    for (let i = 0; i < 3; i++) {
      const p = at(t, 5.0 + i * 0.2, 0.3);
      rect(ctx, x + 34, y + 26 + i * 20, 86 * p, 6, C.paperDim, 3);
      rect(ctx, x + 126, y + 26 + i * 20, 20 * p, 6, C.lime, 3);
    }
    txt(ctx, "JSON / SCHEMA", x + 74, y + 116, { size: 13, family: "mono", color: C.mute, align: "center", spacing: 2 });
  }
  if (id === "hardware") {
    drawChip(ctx, x + 6, y + 10, 76, 64, C.lime, "NV");
    drawChip(ctx, x + 96, y + 10, 76, 64, C.cyan, "ASC");
    wire(ctx, [[x + 86, y + 42], [x + 96, y + 42]], { color: C.line, width: 1.2, alpha: 0.9 });
    txt(ctx, "NVIDIA", x + 44, y + 102, { size: 13, family: "mono", color: C.lime, align: "center", spacing: 1 });
    txt(ctx, "昇腾", x + 134, y + 102, { size: 13, color: C.cyan, align: "center", spacing: 1 });
  }
}

function drawChip(ctx, x, y, w, h, color, label) {
  outline(ctx, x, y, w, h, color, 1.6, 6);
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.15;
  ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
  ctx.globalAlpha = 1;
  txt(ctx, label, x + w / 2, y + h / 2 + 6, { size: 17, family: "mono", color, align: "center", spacing: 1 });
}

function leafMark(ctx, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y + 3); ctx.lineTo(x + 4, y - 4); ctx.stroke();
  ctx.restore();
}
