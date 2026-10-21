import { C, W, H, txt, rule, rect, outline, at, easeOut, easeOutBack, clamp, measure, stamp, font } from "../lib/engine.js";
import { backdrop, label, check } from "../lib/parts.js";

export default {
  id: "open",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.14)", gx: 0.72, gy: 0.3, gridStep: 90 });
    label(ctx, "开源 / OPEN SOURCE", 90, 210, { size: 20, color: C.lime });
    txt(ctx, "把方法，交给所有人。", 90, 292, {
      size: 46, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.15, 0.35),
    });

    const p = easeOutBack(at(t, 0.45, 0.7));
    const yOff = (1 - p) * 520;
    ctx.save();
    ctx.globalAlpha = clamp(at(t, 0.45, 0.4));
    ctx.translate(540, 300 + yOff);
    ctx.rotate(-0.018 + (1 - p) * 0.03);
    ctx.translate(-540, -300);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    rect(ctx, 90, 330, 900, 505, "#F3EEE3", 16);
    ctx.restore();

    // faint commit grid inside the paper
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 12; c++) {
        const on = (r * 7 + c * 11) % 9 < 3;
        ctx.fillStyle = on ? "#D8D2C3" : "#E8E2D5";
        ctx.beginPath();
        ctx.roundRect(620 + c * 26, 372 + r * 26, 17, 17, 3);
        ctx.fill();
      }
    }
    ctx.restore();

    txt(ctx, "github.com/deepseek-ai/DeepInfer", 126, 388, { size: 22, family: "mono", color: "#59645D", spacing: 0.2 });
    txt(ctx, "PUBLIC", 936, 388, { size: 18, family: "mono", color: "#3F5B2E", align: "right", spacing: 3 });
    rule(ctx, 126, 410, 954, 410, "#CFC8B8", 1);

    txt(ctx, "DeepInfer", 122, 512, { size: 82, family: "mono", weight: 700, color: "#101817", spacing: -3 });
    txt(ctx, "高性能、大规模推理框架", 128, 566, { size: 32, weight: 500, color: "#3D4842", spacing: 0.5 });
    txt(ctx, "PART OF DEEPSEEK'S PRODUCTION STACK", 128, 612, { size: 15, family: "mono", color: "#788078", spacing: 2.5 });

    // license chip
    rect(ctx, 126, 660, 236, 58, "#101817", 29);
    txt(ctx, "APACHE-2.0", 244, 697, { size: 22, family: "mono", weight: 700, color: C.lime, align: "center", spacing: 3 });
    txt(ctx, "可商用", 386, 697, { size: 24, weight: 600, color: "#2F3A34", spacing: 1 });

    // file chips + code button
    const files = ["csrc", "deepinfer", "deep_cluster", "examples", "tests"];
    let fx = 126;
    files.forEach((f) => {
      font(ctx, 16, { family: "mono", weight: 500 });
      const w = ctx.measureText(f).width + 26;
      rect(ctx, fx, 752, w, 40, "#E7E0D2", 6);
      txt(ctx, f, fx + 13, 778, { size: 16, family: "mono", color: "#465149" });
      fx += w + 8;
    });
    rect(ctx, 790, 748, 148, 48, "#2F6B3A", 8);
    txt(ctx, "Code", 850, 779, { size: 22, weight: 600, color: "#F3EEE3", align: "center", spacing: 0.5 });
    txt(ctx, "▾", 922, 779, { size: 20, color: "#F3EEE3", align: "center" });

    ctx.restore();
    txt(ctx, "main", 920, 656, { size: 16, family: "mono", color: "#59645D", align: "right", spacing: 1 });

    ctx.restore();

    // stamps
    const words = [
      { cn: "看", en: "READ", at: 3.35 },
      { cn: "改", en: "MODIFY", at: 4.15 },
      { cn: "商用", en: "COMMERCIAL", at: 4.95 },
    ];
    words.forEach((w, i) => {
      const pp = at(t, w.at, 0.32);
      if (pp <= 0) return;
      const x = 92 + i * 300;
      const y = 1006;
      ctx.save();
      ctx.globalAlpha = pp;
      ctx.translate(x + 140, y + 80);
      const s = 0.86 + pp * 0.14;
      ctx.scale(s, s);
      ctx.translate(-(x + 140), -(y + 80));
      rect(ctx, x, y, 280, 160, "rgba(201,245,109,0.055)", 12);
      outline(ctx, x, y, 280, 160, C.lime, 1.5, 12);
      txt(ctx, `${String(i + 1).padStart(2, "0")}`, x + 20, y + 34, { size: 16, family: "mono", color: C.lime, spacing: 2 });
      check(ctx, x + 226, y + 28, 18, C.lime, 0.9);
      txt(ctx, w.cn, x + 24, y + 122, { size: warnSize(w.cn), weight: 700, color: C.paper, spacing: 2 });
      txt(ctx, w.en, x + 258, y + 140, { size: 14, family: "mono", color: C.mute, align: "right", spacing: 2 });
      ctx.restore();
    });

    const fp = at(t, 5.2, 0.4);
    if (fp > 0) {
      ctx.save();
      ctx.globalAlpha = fp;
      rule(ctx, 90, 1222, 990, 1222, C.line, 1);
      txt(ctx, "开源 = 源代码公开：能查看、能修改、能再发布。", 90, 1274, {
        size: 28, color: C.paperDim, spacing: 0.5,
      });
      txt(ctx, "不等于“免费提供服务”。", 90, 1318, { size: 28, color: C.amber, spacing: 0.5 });
      ctx.restore();
    }

    rule(ctx, 90, 1370, 990, 1370, C.line, 1, at(t, 5.1, 0.4));
    txt(ctx, "允许商用，不等于替你付电费。", 90, 1424, { size: 24, color: C.paperDim, spacing: 0.5, alpha: at(t, 5.2, 0.4) });

    // license seal
    const lp = at(t, 3.1, 0.3);
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha = lp;
      stamp(ctx, "APACHE 2.0", 862, 940, -0.09, C.lime, 1);
      ctx.restore();
    }
  },
};

function warnSize(s) {
  return s.length > 1 ? 64 : 84;
}
