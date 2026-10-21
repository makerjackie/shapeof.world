import { C, W, H, txt, rule, rect, at, easeOut, clamp, measure } from "../lib/engine.js";
import { backdrop, label, ring } from "../lib/parts.js";

export default {
  id: "name",
  draw(ctx, t, s) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.10)", gx: 0.5, gy: 0.45, gridStep: 90 });
    ring(ctx, W / 2, 760, 360, t, { color: C.lime, alpha: 0.16, count: 4, speed: 0.24 });

    label(ctx, "它有一个名字", 90, 215, { size: 20, color: C.cyan });

    txt(ctx, "它叫", W / 2, 590, {
      size: 42, weight: 500, color: C.mute, align: "center", spacing: 4, alpha: at(t, 0.05, 0.3),
    });

    const word = "DeepInfer";
    const shown = Math.floor(clamp((t - 0.06) / 0.72) * word.length);
    const size = 136;
    const full = measure(ctx, word, size, { family: "mono", weight: 700, spacing: -2 });
    let x = W / 2 - full / 2;
    ctx.save();
    for (let i = 0; i < shown; i++) {
      const ch = word[i];
      const alpha = i === shown - 1 ? 0.85 : 1;
      const w = measure(ctx, ch, size, { family: "mono", weight: 700, spacing: -2 });
      txt(ctx, ch, x, 780, { size, family: "mono", weight: 700, color: C.paper, spacing: -2, alpha });
      x += w;
    }
    if (shown < word.length) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 16);
      rect(ctx, x + 4, 680, 16, 104, C.lime, 2);
    }
    ctx.restore();

    rule(ctx, W / 2 - 300, 838, W / 2 + 300, 838, C.line, 1, at(t, 1.0, 0.4));

    txt(ctx, "DeepSeek 的推理框架", W / 2, 930, {
      size: 52, weight: 600, color: C.lime, align: "center", spacing: 1, alpha: at(t, 0.86, 0.4),
    });
    txt(ctx, "INFERENCE FRAMEWORK", W / 2, 990, {
      size: 20, family: "mono", color: C.mute, align: "center", spacing: 6, alpha: at(t, 0.98, 0.4),
    });

    const pc = at(t, 1.05, 0.4);
    if (pc > 0) {
      ctx.save();
      ctx.globalAlpha = pc;
      const w = 760;
      rect(ctx, W / 2 - w / 2, 1090, w, 74, "rgba(255,255,255,0.03)", 37);
      rule(ctx, W / 2 - w / 2, 1090, W / 2 + w / 2, 1090, C.line, 1, 0.8);
      txt(ctx, "github.com/deepseek-ai/DeepInfer", W / 2, 1137, {
        size: 25, family: "mono", color: C.paperDim, align: "center", spacing: 0.5,
      });
      ctx.restore();
    }

    // A subtle vertical measure, like a microscope scale.
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) {
      const y = 260 + i * 46;
      const long = i % 5 === 0;
      rule(ctx, 980, y, 980 + (long ? 26 : 12), y, C.dim, 1, 0.8);
      if (long) txt(ctx, String(260 + i * 46), 1016, y + 6, { size: 13, family: "mono", color: C.dim });
    }
    ctx.restore();

    const sp = at(t, 1.1, 0.4);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      rule(ctx, 90, 1240, 990, 1240, C.line, 1);
      const rows = [
        ["TARGET", "DeepSeek-V4.1-Flash"],
        ["LICENSE", "Apache-2.0（框架）"],
        ["HARDWARE", "NVIDIA SM100 / 昇腾 950"],
      ];
      rows.forEach((r, i) => {
        const p = at(t, 1.2 + i * 0.15, 0.35);
        ctx.globalAlpha = sp * p;
        txt(ctx, r[0], 90, 1300 + i * 54, { size: 15, family: "mono", color: C.mute, spacing: 2.5 });
        txt(ctx, r[1], 280, 1300 + i * 54, { size: 19, family: "mono", color: i === 1 ? C.lime : C.paperDim, spacing: 0.5 });
      });
      ctx.restore();
    }

  },
};
