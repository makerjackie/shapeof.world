import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow } from "../lib/engine.js";
import { backdrop, label, check, flow, wire } from "../lib/parts.js";

const TILES = [
  { id: "kernels", cn: "高性能算子", en: "KERNELS", note: "算得更快的零件", at: 0.8 },
  { id: "parallel", cn: "分布式推理", en: "PARALLEL", note: "很多卡，像一张卡", at: 2.0 },
  { id: "spec", cn: "推测解码", en: "SPECULATIVE", note: "先猜，再验", at: 3.2 },
  { id: "async", cn: "异步调度", en: "SCHEDULER", note: "不让任何人干等", at: 4.4 },
  { id: "struct", cn: "结构化输出", en: "STRUCTURED", note: "直接给出可用的格式", at: 5.6 },
  { id: "hardware", cn: "双硬件", en: "HARDWARE", note: "英伟达 / 昇腾", at: 6.8 },
];

export default {
  id: "inside",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.08)", gx: 0.5, gy: 0.3, gridStep: 90 });
    label(ctx, "拆开看 / WHAT'S INSIDE", 120, 185, { size: 20, color: C.lime });
    txt(ctx, "引擎里，装了六样东西。", 120, 265, { size: 56, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35) });

    TILES.forEach((tile, i) => {
      const x = 110 + (i % 3) * 590;
      const y = 350 + Math.floor(i / 3) * 290;
      ctx.save();
      ctx.globalAlpha = 0.22;
      rect(ctx, x, y, 520, 250, "rgba(14,22,24,0.7)", 14);
      outline(ctx, x, y, 520, 250, C.line, 1, 14);
      txt(ctx, `0${i + 1}`, x + 22, y + 30, { size: 14, family: "mono", color: C.mute, spacing: 2 });
      txt(ctx, tile.en, x + 498, y + 30, { size: 12, family: "mono", color: C.mute, align: "right", spacing: 2 });
      txt(ctx, tile.cn, x + 22, y + 78, { size: 36, weight: 600, color: C.paper, spacing: 0.5 });
      ctx.restore();
    });

    TILES.forEach((tile, i) => {
      const p = at(t, tile.at, 0.35);
      if (p <= 0) return;
      const x = 110 + (i % 3) * 590;
      const y = 350 + Math.floor(i / 3) * 290;
      const active = p < 1;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(0, (1 - easeOut(p)) * 20);
      rect(ctx, x, y, 520, 250, "rgba(14,22,24,0.94)", 14);
      outline(ctx, x, y, 520, 250, active ? C.lime : C.line, active ? 2 : 1.2, 14);
      txt(ctx, `0${i + 1}`, x + 22, y + 30, { size: 14, family: "mono", color: active ? C.lime : C.dim, spacing: 2 });
      txt(ctx, tile.en, x + 498, y + 30, { size: 12, family: "mono", color: C.mute, align: "right", spacing: 2 });
      txt(ctx, tile.cn, x + 22, y + 78, { size: 36, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, tile.note, x + 22, y + 222, { size: 17, color: C.mute, spacing: 0.5 });
      drawGlyph(ctx, tile.id, x + 330, y + 90, t);
      ctx.restore();
    });

    const hp = at(t, 8.4, 0.45);
    if (hp > 0) {
      ctx.save();
      ctx.globalAlpha = hp;
      rule(ctx, 120, 930, 1800, 930, C.line, 1);
      txt(ctx, "NVIDIA SM100", 120, 986, { size: 24, family: "mono", color: C.lime, spacing: 1 });
      txt(ctx, "华为昇腾 950", 430, 986, { size: 24, weight: 600, color: C.cyan, spacing: 1 });
      txt(ctx, "目标只有一个：让每张卡都忙起来。", 1800, 986, { size: 24, color: C.paperDim, align: "right", spacing: 0.5 });
      ctx.restore();
    }
  },
};

function drawGlyph(ctx, id, x, y, t) {
  if (id === "kernels") {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        const on = (r * 5 + c * 3) % 7 < 3;
        const ph = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + (r + c) * 0.4));
        ctx.save();
        ctx.globalAlpha = on ? ph : 0.15;
        ctx.fillStyle = on ? C.lime : C.dim;
        ctx.beginPath(); ctx.roundRect(x + c * 24, y + r * 24, 16, 16, 3); ctx.fill();
        ctx.restore();
      }
    }
  }
  if (id === "parallel") {
    const nodes = [[x + 8, y + 34], [x + 68, y + 8], [x + 68, y + 84], [x + 132, y + 46]];
    nodes.forEach((n) => {
      glow(ctx, n[0], n[1], 26, "rgba(201,245,109,0.22)", 0.45);
      ctx.fillStyle = C.lime;
      ctx.beginPath(); ctx.arc(n[0], n[1], 4, 0, Math.PI * 2); ctx.fill();
    });
    [[0, 1], [0, 2], [1, 3], [2, 3]].forEach(([a, b]) => wire(ctx, [nodes[a], nodes[b]], { color: C.limeDim, width: 1.1, alpha: 0.5 }));
    flow(ctx, [nodes[0], nodes[1], nodes[3]], t, { count: 3, speed: 0.5, size: 4, color: C.lime, alpha: 0.8 });
    flow(ctx, [nodes[0], nodes[2], nodes[3]], t, { count: 3, speed: 0.7, size: 4, color: C.cyan, alpha: 0.7 });
  }
  if (id === "spec") {
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + i));
      outline(ctx, x + 6 + i * 24, y + 18, 16, 16, C.cyan, 1.3, 3);
      ctx.restore();
    }
    txt(ctx, "？", x + 104, y + 42, { size: 24, family: "mono", color: C.cyan });
    check(ctx, x + 152, y + 28, 26, C.lime, 0.95);
    txt(ctx, "先猜 4 个", x + 4, y + 92, { size: 14, color: C.mute, spacing: 1 });
    txt(ctx, "再一次验证", x + 110, y + 92, { size: 14, color: C.lime, spacing: 1 });
  }
  if (id === "async") {
    for (let i = 0; i < 4; i++) {
      const w = 62 + ((i * 29) % 46);
      const xx = x + 4 + ((i * 19) % 34);
      const yy = y + 6 + i * 23;
      rect(ctx, xx, yy, w, 10, i % 2 ? "rgba(121,221,230,0.35)" : "rgba(201,245,109,0.4)", 5);
      const p = (t * 0.6 + i * 0.22) % 1;
      ctx.fillStyle = i % 2 ? C.cyan : C.lime;
      ctx.beginPath(); ctx.arc(xx + w * p, yy + 5, 3, 0, Math.PI * 2); ctx.fill();
    }
    txt(ctx, "重叠执行", x + 4, y + 116, { size: 14, color: C.mute, spacing: 1 });
  }
  if (id === "struct") {
    txt(ctx, "{", x - 6, y + 74, { size: 86, family: "mono", color: C.lime, alpha: 0.6 });
    txt(ctx, "}", x + 132, y + 74, { size: 86, family: "mono", color: C.lime, alpha: 0.6 });
    for (let i = 0; i < 3; i++) {
      rect(ctx, x + 30, y + 22 + i * 20, 74, 5, C.paperDim, 2);
      rect(ctx, x + 110, y + 22 + i * 20, 18, 5, C.lime, 2);
    }
    txt(ctx, "JSON / SCHEMA", x + 68, y + 112, { size: 12, family: "mono", color: C.mute, align: "center", spacing: 2 });
  }
  if (id === "hardware") {
    drawChip(ctx, x + 2, y + 8, 82, 68, C.lime, "NV");
    drawChip(ctx, x + 98, y + 8, 82, 68, C.cyan, "ASC");
    wire(ctx, [[x + 84, y + 42], [x + 98, y + 42]], { color: C.line, width: 1.1, alpha: 0.9 });
    txt(ctx, "NVIDIA", x + 43, y + 98, { size: 12, family: "mono", color: C.lime, align: "center", spacing: 1 });
    txt(ctx, "昇腾", x + 139, y + 98, { size: 12, color: C.cyan, align: "center", spacing: 1 });
  }
}

function drawChip(ctx, x, y, w, h, color, label) {
  outline(ctx, x, y, w, h, color, 1.5, 6);
  ctx.save();
  ctx.globalAlpha *= 0.14;
  ctx.fillStyle = color;
  ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  ctx.restore();
  txt(ctx, label, x + w / 2, y + h / 2 + 6, { size: 16, family: "mono", color, align: "center", spacing: 1 });
}
