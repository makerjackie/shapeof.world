import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow } from "../lib/engine.js";
import { backdrop, label, flow, wire } from "../lib/parts.js";

const FORMATS = [
  { name: "Chat Completions", code: '"messages": [...]', y: 400 },
  { name: "Responses", code: '"input": "..."', y: 512 },
  { name: "Messages", code: '"content": [...]', y: 624 },
];

export default {
  id: "recipe",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.10)", gx: 0.35, gy: 0.35, gridStep: 90 });
    label(ctx, "另一个开源组件 / DEEPSEEK-RECIPE", 120, 185, { size: 20, color: C.cyan });
    txt(ctx, "API 说的话，模型听不懂。", 120, 270, { size: 56, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35) });

    const mp = at(t, 1.4, 0.35);
    if (mp > 0) {
      ctx.save();
      ctx.globalAlpha = mp;
      rect(ctx, 1600, 210, 200, 50, "rgba(121,221,230,0.07)", 25);
      outline(ctx, 1600, 210, 200, 50, C.cyan, 1.4, 25);
      txt(ctx, "MIT LICENSE", 1700, 242, { size: 16, family: "mono", color: C.cyan, align: "center", spacing: 2 });
      ctx.restore();
    }

    FORMATS.forEach((f, i) => {
      const p = at(t, 0.1 + i * 0.12, 0.3);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      const x = 110 - (1 - p) * 30;
      rect(ctx, x, f.y, 360, 92, "rgba(16,24,26,0.94)", 10);
      outline(ctx, x, f.y, 360, 92, C.line, 1.2, 10);
      rect(ctx, x, f.y, 4, 92, C.cyan, 2);
      txt(ctx, f.name, x + 20, f.y + 38, { size: 22, weight: 600, color: C.paper, spacing: 0.2 });
      txt(ctx, f.code, x + 20, f.y + 70, { size: 14, family: "mono", color: C.mute, spacing: 0.2 });
      ctx.restore();
    });
    txt(ctx, "三种请求格式", 110, 770, { size: 18, color: C.mute, spacing: 1, alpha: at(t, 1.2, 0.4) });

    // converter
    const cp = at(t, 0.2, 0.3);
    if (cp > 0) {
      ctx.save();
      ctx.globalAlpha = cp;
      ctx.translate(0, (1 - cp) * 20);
      rect(ctx, 540, 380, 420, 440, "rgba(201,245,109,0.05)", 18);
      outline(ctx, 540, 380, 420, 440, C.lime, 1.6, 18);
      txt(ctx, "deepseek-recipe", 570, 432, { size: 28, family: "mono", weight: 700, color: C.lime, spacing: 0 });
      txt(ctx, "翻译器", 930, 432, { size: 20, color: C.paperDim, align: "right", spacing: 2 });
      txt(ctx, "{ }", 750, 570, { size: 120, family: "mono", color: C.lime, align: "center", alpha: 0.55 });
      const sy = 470 + ((t * 55) % 250);
      rule(ctx, 570, sy, 930, sy, C.lime, 1, 0.25);
      txt(ctx, "请求格式 → 对话 → 提示词 → token", 750, 700, { size: 18, color: C.paperDim, align: "center", spacing: 0.5 });
      txt(ctx, "连 tokenizer 一起开源", 750, 742, { size: 16, color: C.mute, align: "center", spacing: 1 });
      txt(ctx, "MIT", 930, 790, { size: 14, family: "mono", color: C.cyan, align: "right", spacing: 2 });
      ctx.restore();
    }

    // model
    const modp = at(t, 0.55, 0.35);
    if (modp > 0) {
      ctx.save();
      ctx.globalAlpha = modp;
      rect(ctx, 1060, 400, 720, 400, "rgba(16,24,26,0.92)", 16);
      outline(ctx, 1060, 400, 720, 400, C.line, 1.3, 16);
      txt(ctx, "DeepSeek 模型", 1092, 456, { size: 28, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, "MODEL / SAME AS OFFICIAL", 1092, 490, { size: 13, family: "mono", color: C.mute, spacing: 2 });
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 8; c++) {
          const on = t > 2.8 + (r + c) * 0.035;
          token(ctx, 1100 + c * 64, 540 + r * 44, 20, on ? C.lime : C.dim, on ? 0.8 : 0.3);
        }
      }
      glow(ctx, 1420, 640, 190, "rgba(201,245,109,0.14)", 0.5 * modp);
      ctx.restore();
    }

    // wires
    const wp = at(t, 1.2, 0.4);
    FORMATS.forEach((f) => {
      wire(ctx, [[470, f.y + 46], [505, f.y + 46], [505, 600], [540, 600]], { color: C.line, width: 1.5, alpha: wp });
      flow(ctx, [[470, f.y + 46], [505, f.y + 46], [505, 600], [540, 600]], t, {
        count: 2, speed: 0.55, size: 4, color: C.cyan, alpha: wp * 0.75, seed: f.y,
      });
    });
    wire(ctx, [[960, 600], [1060, 600]], { color: C.line, width: 1.5, alpha: wp });
    flow(ctx, [[960, 600], [1060, 600]], t, { count: 3, speed: 0.8, size: 4, color: C.lime, alpha: wp * 0.9 });

    // bottom
    const bp = at(t, 4.8, 0.4);
    if (bp > 0) {
      ctx.save();
      ctx.globalAlpha = bp;
      rule(ctx, 120, 880, 1800, 880, C.line, 1);
      txt(ctx, "deepseek-recipe", 120, 940, { size: 44, family: "mono", weight: 700, color: C.lime, spacing: 0 });
      txt(ctx, "把各种请求，翻译成模型能读的输入。", 620, 938, { size: 28, color: C.paperDim, spacing: 0.5 });
      txt(ctx, "自己部署，也能和官方对齐。", 1800, 992, { size: 22, color: C.mute, align: "right", spacing: 0.5 });
      ctx.restore();
    }
  },
};
