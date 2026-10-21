import { C, W, H, txt, rule, rect, outline, at, clamp, token } from "../lib/engine.js";
import { backdrop, flow, wire } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "recipe",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.12)", gx: 0.4, gy: 0.35, gridStep: 90 });
    txt(ctx, "还开源了", 108, 260, { size: 40, color: C.mute, spacing: 2, alpha: at(t, 0.02, 0.15) });
    slam(ctx, "deepseek-recipe", 104, 380, { size: 86, family: "mono", weight: 700, color: C.lime, spacing: -1 }, at(t, 0.1, 0.2));
    txt(ctx, "MIT", 1780, 260, { size: 20, family: "mono", color: C.cyan, align: "right", spacing: 3, alpha: at(t, 0.1, 0.2) });

    // pipeline
    const p = at(t, 0.6, 0.25);
    ctx.save();
    ctx.globalAlpha = p;
    const boxes = [
      { x: 110, w: 330, label: "API 请求", sub: "Chat / Responses / Messages" },
      { x: 560, w: 360, label: "翻译器", sub: "deepseek-recipe" },
      { x: 1060, w: 360, label: "模型输入", sub: "prompt / token" },
    ];
    boxes.forEach((b, i) => {
      rect(ctx, b.x, 500, b.w, 180, i === 1 ? "rgba(201,245,109,0.08)" : "rgba(16,24,26,0.9)", 12);
      outline(ctx, b.x, 500, b.w, 180, i === 1 ? C.lime : C.line, 1.5, 12);
      txt(ctx, b.label, b.x + 24, 560, { size: 30, weight: 600, color: i === 1 ? C.lime : C.paper, spacing: 1 });
      txt(ctx, b.sub, b.x + 24, 610, { size: 16, family: "mono", color: C.mute, spacing: 0.5 });
      if (i < 2) {
        const x1 = b.x + b.w, x2 = boxes[i + 1].x;
        wire(ctx, [[x1, 590], [x2, 590]], { color: C.line, width: 2, alpha: 0.9 });
        flow(ctx, [[x1, 590], [x2, 590]], t, { count: 4, speed: 1.6, size: 5, color: i === 0 ? C.cyan : C.lime, alpha: 0.9 });
      }
    });
    for (let c = 0; c < 5; c++) token(ctx, 1280 + c * 24, 538, 16, C.lime, 0.8);
    ctx.restore();

    txt(ctx, "API 说的话，模型听不懂。", 108, 830, { size: 48, weight: 600, color: C.paper, spacing: 1, alpha: at(t, 1.2, 0.2) });
    txt(ctx, "它负责翻译。", 108, 890, { size: 34, color: C.lime, spacing: 2, alpha: at(t, 1.4, 0.2) });

    cutFlash(ctx, t, [1.2]);
  },
};
