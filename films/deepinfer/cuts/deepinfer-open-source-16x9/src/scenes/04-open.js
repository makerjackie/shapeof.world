import { C, W, H, txt, rule, rect, outline, at, easeOut, easeOutBack, clamp, stamp } from "../lib/engine.js";
import { backdrop, label, check } from "../lib/parts.js";

export default {
  id: "open",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.13)", gx: 0.7, gy: 0.3, gridStep: 90 });
    label(ctx, "开源 / OPEN SOURCE", 120, 185, { size: 20, color: C.lime });
    txt(ctx, "把方法，交给所有人。", 120, 272, { size: 58, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35) });

    const p = easeOutBack(at(t, 0.05, 0.55));
    ctx.save();
    ctx.globalAlpha = clamp(at(t, 0.05, 0.3));
    ctx.translate(610, 595 + (1 - p) * 180);
    ctx.rotate(-0.012 + (1 - p) * 0.02);
    ctx.translate(-610, -595);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 16;
    rect(ctx, 120, 380, 980, 430, "#F3EEE3", 16);
    ctx.restore();

    // commit grid inside the paper
    ctx.save();
    ctx.globalAlpha *= 0.32;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 10; c++) {
        const on = (r * 7 + c * 11) % 10 < 3;
        ctx.fillStyle = on ? "#D8D2C3" : "#E8E2D5";
        ctx.beginPath(); ctx.roundRect(820 + c * 26, 424 + r * 26, 17, 17, 3); ctx.fill();
      }
    }
    ctx.restore();

    txt(ctx, "github.com/deepseek-ai/DeepInfer", 156, 438, { size: 21, family: "mono", color: "#59645D", spacing: 0.2 });
    txt(ctx, "PUBLIC", 1054, 438, { size: 17, family: "mono", color: "#3F5B2E", align: "right", spacing: 3 });
    rule(ctx, 156, 460, 1064, 460, "#CFC8B8", 1);

    txt(ctx, "DeepInfer", 152, 566, { size: 78, family: "mono", weight: 700, color: "#101817", spacing: -3 });
    txt(ctx, "高性能、大规模推理框架", 158, 618, { size: 30, weight: 500, color: "#3D4842", spacing: 0.5 });
    txt(ctx, "PART OF DEEPSEEK'S PRODUCTION STACK", 158, 656, { size: 14, family: "mono", color: "#788078", spacing: 2.5 });

    rect(ctx, 158, 692, 220, 54, "#101817", 27);
    txt(ctx, "APACHE-2.0", 268, 727, { size: 20, family: "mono", weight: 700, color: C.lime, align: "center", spacing: 3 });
    txt(ctx, "可商用", 396, 727, { size: 22, weight: 600, color: "#2F3A34", spacing: 1 });

    const files = ["csrc", "deepinfer", "examples", "tests"];
    let fx = 158;
    files.forEach((f) => {
      ctx.font = `500 15px "SF Mono", Menlo, monospace`;
      const w = ctx.measureText(f).width + 24;
      rect(ctx, fx, 770, w, 36, "#E7E0D2", 6);
      txt(ctx, f, fx + 12, 794, { size: 15, family: "mono", color: "#465149" });
      fx += w + 8;
    });
    rect(ctx, 940, 766, 130, 44, "#2F6B3A", 8);
    txt(ctx, "Code ▾", 1005, 796, { size: 19, weight: 600, color: "#F3EEE3", align: "center" });

    ctx.restore();

    // three permissions
    const words = [
      { cn: "看", en: "READ", at: 3.9 },
      { cn: "改", en: "MODIFY", at: 5.0 },
      { cn: "商用", en: "COMMERCIAL", at: 6.1 },
    ];
    words.forEach((w, i) => {
      const pp = at(t, w.at, 0.35);
      if (pp <= 0) return;
      const y = 380 + i * 155;
      ctx.save();
      ctx.globalAlpha = pp;
      rect(ctx, 1180, y, 620, 128, "rgba(201,245,109,0.05)", 10);
      outline(ctx, 1180, y, 620, 128, C.lime, 1.4, 10);
      txt(ctx, `0${i + 1}`, 1200, y + 30, { size: 15, family: "mono", color: C.lime, spacing: 2 });
      check(ctx, 1762, y + 26, 18, C.lime, 0.9);
      txt(ctx, w.cn, 1210, y + 102, { size: w.cn.length > 1 ? 58 : 74, weight: 700, color: C.paper, spacing: 2 });
      txt(ctx, w.en, 1770, y + 112, { size: 14, family: "mono", color: C.mute, align: "right", spacing: 2 });
      ctx.restore();
    });

    const lp = at(t, 3.4, 0.3);
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha = lp;
      stamp(ctx, "APACHE 2.0", 1580, 940, -0.08, C.lime, 1);
      ctx.restore();
    }

    const fp = at(t, 7.2, 0.4);
    if (fp > 0) {
      ctx.save();
      ctx.globalAlpha = fp;
      rule(ctx, 120, 920, 1080, 920, C.line, 1);
      txt(ctx, "Apache-2.0：能看、能改、能商用。", 120, 980, { size: 38, weight: 500, color: C.paper, spacing: 0.5 });
      ctx.restore();
    }
  },
};
