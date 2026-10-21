import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow, font } from "../lib/engine.js";
import { backdrop, label, flow, wire, check } from "../lib/parts.js";

const FORMATS = [
  { name: "Chat Completions", code: '"messages": [...]', x: 70 },
  { name: "Responses", code: '"input": "..."', x: 392 },
  { name: "Messages", code: '"content": [...]', x: 714 },
];

export default {
  id: "recipe",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.10)", gx: 0.5, gy: 0.3, gridStep: 90 });
    label(ctx, "另一个开源组件 / DEEPSEEK-RECIPE", 90, 205, { size: 20, color: C.cyan });
    txt(ctx, "API 说的话，模型听不懂。", 90, 282, {
      size: 44, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35),
    });

    const mp = at(t, 1.4, 0.35);
    if (mp > 0) {
      ctx.save();
      ctx.globalAlpha = mp;
      rect(ctx, 806, 232, 184, 50, "rgba(121,221,230,0.07)", 25);
      outline(ctx, 806, 232, 184, 50, C.cyan, 1.4, 25);
      txt(ctx, "MIT LICENSE", 898, 264, { size: 16, family: "mono", color: C.cyan, align: "center", spacing: 2 });
      ctx.restore();
    }

    // source formats, in a row
    FORMATS.forEach((f, i) => {
      const p = at(t, 0.35 + i * 0.18, 0.4);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      const y = 344 - (1 - p) * 18;
      rect(ctx, f.x, y, 296, 112, "rgba(16,24,26,0.94)", 10);
      outline(ctx, f.x, y, 296, 112, C.line, 1.3, 10);
      rect(ctx, f.x, y, 4, 112, C.cyan, 2);
      txt(ctx, f.name, f.x + 20, y + 42, { size: 20, weight: 600, color: C.paper, spacing: 0.2 });
      txt(ctx, f.code, f.x + 20, y + 80, { size: 15, family: "mono", color: C.mute, spacing: 0.2 });
      txt(ctx, `0${i + 1}`, f.x + 270, y + 34, { size: 14, family: "mono", color: C.dim, align: "right", spacing: 1 });
      ctx.restore();
    });
    txt(ctx, "客户端：三种请求格式", 70, 494, { size: 18, color: C.mute, spacing: 1, alpha: at(t, 0.9, 0.4) });

    // converter
    const cp = at(t, 0.95, 0.5);
    if (cp > 0) {
      ctx.save();
      ctx.globalAlpha = cp;
      ctx.translate(0, (1 - cp) * 24);
      rect(ctx, 90, 540, 900, 292, "rgba(201,245,109,0.045)", 18);
      outline(ctx, 90, 540, 900, 292, C.lime, 1.6, 18);
      txt(ctx, "deepseek-recipe", 122, 596, { size: 28, family: "mono", weight: 700, color: C.lime, spacing: 0 });
      txt(ctx, "把不同格式，折叠成同一种输入", 968, 594, { size: 18, color: C.mute, align: "right", spacing: 0.5 });

      const stages = [
        { x: 122, label: "请求格式", sub: "REQUESTS" },
        { x: 420, label: "统一对话", sub: "CONVERSATION" },
        { x: 718, label: "模型输入", sub: "PROMPT / TOKENS" },
      ];
      stages.forEach((st, i) => {
        const p = at(t, 1.35 + i * 0.32, 0.35);
        ctx.save();
        ctx.globalAlpha = cp * p;
        rect(ctx, st.x, 646, 232, 100, "rgba(9,14,15,0.8)", 8);
        outline(ctx, st.x, 646, 232, 100, i === 2 ? C.lime : C.line, 1.2, 8);
        txt(ctx, st.label, st.x + 18, 688, { size: 24, weight: 600, color: i === 2 ? C.lime : C.paper, spacing: 0.5 });
        txt(ctx, st.sub, st.x + 18, 720, { size: 12, family: "mono", color: C.mute, spacing: 1.5 });
        if (i < 2) {
          wire(ctx, [[st.x + 232, 696], [st.x + 262, 696]], { color: C.lime, width: 1.5, alpha: 0.7 });
          flow(ctx, [[st.x + 232, 696], [st.x + 262, 696]], t, { count: 2, speed: 0.7, size: 4, color: C.lime, alpha: 0.9 });
        }
        ctx.restore();
      });
      txt(ctx, "连 tokenizer 一起开源", 122, 796, { size: 17, color: C.paperDim, spacing: 0.5 });
      txt(ctx, "MIT", 956, 796, { size: 15, family: "mono", color: C.cyan, align: "right", spacing: 2 });
      ctx.restore();
    }

    // arrows into converter
    const ap = at(t, 1.2, 0.4);
    if (ap > 0) {
      FORMATS.forEach((f) => {
        const x = f.x + 148;
        wire(ctx, [[x, 462], [x, 510], [540, 510], [540, 540]], { color: C.line, width: 1.4, alpha: ap * 0.8 });
        flow(ctx, [[x, 462], [x, 510], [540, 510], [540, 540]], t, {
          count: 2, speed: 0.6, size: 4, color: C.cyan, alpha: ap * 0.7, seed: f.x,
        });
      });
    }

    // model
    const modp = at(t, 2.1, 0.5);
    if (modp > 0) {
      ctx.save();
      ctx.globalAlpha = modp;
      wire(ctx, [[540, 832], [540, 880]], { color: C.line, width: 1.6, alpha: modp });
      flow(ctx, [[540, 832], [540, 880]], t, { count: 2, speed: 0.7, size: 5, color: C.lime });
      rect(ctx, 90, 886, 900, 214, "rgba(16,24,26,0.92)", 16);
      outline(ctx, 90, 886, 900, 214, C.line, 1.3, 16);
      txt(ctx, "DeepSeek 模型", 122, 946, { size: 30, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, "MODEL / SAME AS OFFICIAL", 122, 982, { size: 13, family: "mono", color: C.mute, spacing: 2 });
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 10; c++) {
          const on = t > 2.6 + (r + c) * 0.03;
          token(ctx, 430 + c * 50, 930 + r * 38, 18, on ? C.lime : C.dim, on ? 0.8 : 0.3);
        }
      }
      glow(ctx, 700, 990, 190, "rgba(201,245,109,0.14)", 0.5 * modp);
      ctx.restore();
    }

    // ghost checks
    [0, 1].forEach((i) => {
      const y = 1180 + i * 78;
      ctx.save();
      ctx.globalAlpha = 0.1;
      check(ctx, 112, y + 6, 22, C.paper);
      txt(ctx, i === 0 ? "自己部署" : "和官方效果对齐", 146, y + 14, { size: 30, weight: 600, color: C.paper, spacing: 0.5 });
      ctx.restore();
    });

    // checks
    const checks = [
      { at: 4.2, text: "自己部署", sub: "服务和数据都在自己手里" },
      { at: 4.9, text: "和官方效果对齐", sub: "请求、提示词、输出解析一致" },
    ];
    checks.forEach((c, i) => {
      const p = at(t, c.at, 0.4);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      const y = 1180 + i * 78;
      check(ctx, 112 + (1 - p) * 12, y + 6, 22, C.lime);
      txt(ctx, c.text, 146 + (1 - p) * 12, y + 14, { size: 30, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, c.sub, 430, y + 14, { size: 20, color: C.mute, spacing: 0.5 });
      ctx.restore();
    });

    rule(ctx, 90, 1350, 990, 1350, C.line, 1, at(t, 5.6, 0.4));
    txt(ctx, "客户端说人话 → 模型听得懂 → 再把回答翻译回去", 90, 1404, {
      size: 24, color: C.paperDim, spacing: 0.5, alpha: at(t, 5.7, 0.4),
    });
  },
};
