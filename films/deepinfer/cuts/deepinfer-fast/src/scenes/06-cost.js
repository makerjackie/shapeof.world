import { C, W, H, txt, rule, rect, outline, at, clamp, token } from "../lib/engine.js";
import { backdrop, gpu } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "cost",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(255,180,92,0.11)", gx: 0.2, gy: 0.3, gridStep: 90 });
    txt(ctx, "为什么重要？", 108, 210, { size: 22, family: "mono", color: C.amber, spacing: 4, alpha: at(t, 0.02, 0.15) });
    slam(ctx, "01  成本", 104, 300, { size: 64, weight: 700, color: C.paper, spacing: 2 }, at(t, 0.05, 0.2));

    gpu(ctx, 120, 380, 200, 140, { heat: 0.4 });
    for (let i = 0; i < 5; i++) {
      const h = 14 + i * 10;
      rect(ctx, 120 + i * 38, 620 - h, 20, h, i < 4 ? C.amber : C.red, 3);
    }
    txt(ctx, "同一张卡 / 同一度电", 120, 670, { size: 20, color: C.mute, spacing: 2 });

    const bands = [
      { y: 380, label: "普通调度", dense: false, color: C.paperDim },
      { y: 540, label: "DeepInfer", dense: true, color: C.lime },
    ];
    bands.forEach((b) => {
      rect(ctx, 460, b.y, 1360, 130, "rgba(13,20,22,0.88)", 10);
      outline(ctx, 460, b.y, 1360, 130, b.dense ? C.lime : C.line, b.dense ? 1.6 : 1, 10);
      txt(ctx, b.label, 490, b.y + 46, { size: 26, weight: 600, color: b.color, spacing: 1 });
      const n = b.dense ? 15 : 5;
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < n; i++) {
          const ph = (t * (b.dense ? 1.0 : 0.4) + i / n + r * 0.1) % 1;
          token(ctx, 820 + ph * 940, b.y + 34 + r * 30, 10, b.color, (1 - ph) * (b.dense ? 0.95 : 0.55));
        }
      }
    });

    if (t >= 1.2 && t < 2.0) {
      slam(ctx, "同样的电", 104, 800, { size: 70, weight: 700, color: C.paper, spacing: 2 }, at(t, 1.22, 0.16));
    }
    if (t >= 2.0 && t < 2.8) {
      slam(ctx, "更多 token", 104, 800, { size: 70, weight: 700, color: C.lime, spacing: 2 }, at(t, 2.02, 0.16));
    }
    if (t > 2.8) {
      slam(ctx, "更便宜", 100, 830, { size: 170, family: "serif", weight: 700, color: C.lime, spacing: -3 }, at(t, 2.82, 0.2));
      txt(ctx, "同样的算力，服务更多的人", 108, 900, { size: 28, color: C.mute, spacing: 1, alpha: at(t, 3.1, 0.2) });
    }

    cutFlash(ctx, t, [1.2, 2.0, 2.8]);
  },
};
