import React from "react";
import { AbsoluteFill, random } from "remotion";
import { ClaudeGlyph, PriceTag, Spark, Whale, WhaleGlyph } from "../art";
import { drift, EBACK, EIO, EIN, EO, keys, lerp, pr, Source, Stamp, swing, useT } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { barA, BEAT_A } from "../timing";

// ───────── 1. Hook: two price tags; Claude's climbs on every beat and slams at ¥134 on the bar-1 downbeat ─────────

export const PRICE_STEPS: [number, number][] = [
  [0, 8],
  [barA(0.25), 30],
  [barA(0.5), 67],
  [barA(0.75), 100],
  [barA(1), 134],
];
const priceAt = (t: number) => {
  let v = PRICE_STEPS[0][1];
  for (let i = 1; i < PRICE_STEPS.length; i++) v = lerp(v, PRICE_STEPS[i][1], pr(t, PRICE_STEPS[i][0] - 0.1, 0.16, EO));
  return Math.min(134, v);
};

export const HOOK_END = barA(4);

export const Hook: React.FC = () => {
  const t = useT();
  const slam = barA(1);
  const exit = pr(t, HOOK_END - 0.25, 0.45, EIN); // tags are pulled up when the title receipt shoots out
  const inL = pr(t, 0, 0.5, EBACK);
  const inR = pr(t, 0.05, 0.55, EBACK);
  const heat = pr(t, slam - 0.1, 0.25);
  const bump = Math.max(0, 1 - Math.abs(t - slam) / 0.25);
  // camera: a slow push in, a small kick on the slam
  const cam = keys(t, [[0, 1.0], [slam, 1.04], [HOOK_END, 1.12]], EIO) + 0.025 * bump;
  const camY = keys(t, [[0, 0], [HOOK_END, -30]]);
  const angL = swing(t, 0, 7, 0.9, 1.6) + swing(t, slam, -2.5, 1.1, 2) + drift(t, 1, 1.2);
  const angR = swing(t, 0.05, -8, 0.85, 1.5) + swing(t, slam, 9, 1.2, 1.8) + drift(t, 2, 1.2);
  const stamp17 = barA(1.25);
  const peek = pr(t, barA(3), 0.5, EBACK);
  const whaleIn = pr(t, barA(2.5), 0.5, EBACK);
  return (
    <AbsoluteFill style={{ transform: `translateY(${camY}px) scale(${cam})`, transformOrigin: "960px 600px" }}>
      {/* the two tags */}
      <div style={{ position: "absolute", left: 360, top: lerp(-620, 300, inL) - exit * 1200 }}>
        <PriceTag
          w={400}
          color={K.deepseek}
          deep={K.deepseekDeep}
          glyph={<WhaleGlyph size={38} />}
          name="DeepSeek"
          gloss="深度求索 · V4.1 Flash"
          value={8}
          priceColor={K.deepseekDeep}
          angle={angL}
        />
      </div>
      <div style={{ position: "absolute", left: 1080, top: lerp(-620, 262, inR) - exit * 1200, transform: `scale(${1 + 0.07 * bump})`, transformOrigin: "230px 0" }}>
        <PriceTag
          w={460}
          color={K.claude}
          deep={K.claudeDeep}
          glyph={<ClaudeGlyph size={38} />}
          name="Claude Opus 5.5"
          gloss="智能排行第 1 · Anthropic 出品"
          value={priceAt(t)}
          priceColor={heat > 0.5 ? K.redDeep : K.ink}
          angle={angR}
          heat={heat}
        />
      </div>
      {/* speed lines on each step */}
      {PRICE_STEPS.slice(1).map(([s0], i) => {
        const p = pr(t, s0 - 0.05, 0.3, EO);
        if (p <= 0 || p >= 1) return null;
        return Array.from({ length: 5 }).map((_, k) => (
          <div key={`${i}-${k}`} style={{ position: "absolute", left: 1570 + p * 120, top: 560 + k * 34, width: 90 * (1 - p), height: 6, borderRadius: 3, background: i === 3 ? K.red : K.claudeHi, opacity: 1 - p }} />
        ));
      })}
      {/* sparks on the slam */}
      {t > slam && t < slam + 1
        ? Array.from({ length: 20 }).map((_, k) => {
            const p = pr(t, slam, 0.8, EO);
            const a = random(`h${k}`) * Math.PI * 2;
            const d = 160 + random(`hd${k}`) * 260;
            return <div key={k} style={{ position: "absolute", left: 1310 + Math.cos(a) * d * p, top: 600 + Math.sin(a) * d * p * 0.7, width: 16, height: 5, borderRadius: 3, background: k % 3 ? K.red : K.gold, transform: `rotate(${a}rad)`, opacity: 1 - p }} />;
          })
        : null}
      {/* 17x between the tags */}
      <div style={{ position: "absolute", left: 800, top: 560, opacity: 1 - exit }}>
        <Stamp t={t} at={stamp17} color={K.red} size={92} rot={-10}>
          17 倍
        </Stamp>
      </div>
      {/* the characters react */}
      <div style={{ position: "absolute", left: 1560, top: lerp(1100, 740, peek) + exit * 400 }}>
        <Spark t={t} size={190} mood="smug" beat={BEAT_A} />
      </div>
      <div style={{ position: "absolute", left: 90, top: lerp(1100, 790, whaleIn) + exit * 400 }}>
        <Whale t={t} size={230} mood={t > barA(3) ? "sweat" : "shock"} beat={BEAT_A} />
      </div>
      <Source o={1 - exit}>
        官方标价 2026-10-22 · Opus 5.5 输出 $20，按当日中间价 6.7195 约合 ¥134 · DeepSeek V4.1 Flash 高峰价 ¥8 · 17 倍 = $20 ÷ $1.20 · 智能排行：Artificial Analysis（美国 AI 评测机构）智能指数第 1
      </Source>
    </AbsoluteFill>
  );
};

// ───────── 2. Title: a receipt shoots out of a slot with the title printed on it ─────────

export const TITLE_END = barA(6);

export const Title: React.FC = () => {
  const t = useT();
  const at = HOOK_END;
  const rise = pr(t, at - 0.15, 0.55, EBACK);
  const out = pr(t, TITLE_END - 0.35, 0.6, EIN);
  const sweep = pr(t, barA(5), 1.1, EIO);
  const y = lerp(1180, 250, rise) - out * 1250 - pr(t, at + 0.4, TITLE_END - at, (z) => z) * 40;
  const curl = Math.sin(t * 2.1) * 1.2;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 960 - 560, top: y, width: 1120, height: 620, transform: `rotate(${-2 + curl * 0.4 + pr(t, at, TITLE_END - at, EIO) * 1.5}deg) scale(${1 + pr(t, at + 0.3, TITLE_END - at, (z) => z) * 0.06})` }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, #e9e3d4, ${K.receipt} 10%, ${K.receipt} 90%, #e4ddcc)`,
            boxShadow: "0 50px 120px rgba(0,0,0,0.7)",
            clipPath:
              "polygon(0 14px, 3% 0, 6% 14px, 9% 0, 12% 14px, 15% 0, 18% 14px, 21% 0, 24% 14px, 27% 0, 30% 14px, 33% 0, 36% 14px, 39% 0, 42% 14px, 45% 0, 48% 14px, 51% 0, 54% 14px, 57% 0, 60% 14px, 63% 0, 66% 14px, 69% 0, 72% 14px, 75% 0, 78% 14px, 81% 0, 84% 14px, 87% 0, 90% 14px, 93% 0, 96% 14px, 100% 0, 100% 100%, 0 100%)",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 70, right: 70, top: 60, borderBottom: "3px dashed #a59f92", paddingBottom: 18, display: "flex", justifyContent: "space-between", fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#6b665c" }}>
            <span>小票 · 世界的形状</span>
            <span>2026-10-22</span>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 176, color: K.ink, letterSpacing: 4, whiteSpace: "nowrap" }}>
            AI 的<span style={{ color: K.time }}>真实</span>价格
          </div>
          <div style={{ position: "absolute", left: 70, right: 70, top: 470, borderTop: "3px dashed #a59f92" }} />
          <div style={{ position: "absolute", left: 70, top: 500, fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#6b665c", whiteSpace: "nowrap" }}>单价 · 用量 · 包月 · ……</div>
          <div style={{ position: "absolute", top: 0, bottom: 0, width: 260, left: `${lerp(-30, 120, sweep)}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", transform: "skewX(-18deg)" }} />
        </div>
      </div>
      {/* the slot it comes out of */}
      <div style={{ position: "absolute", left: 960 - 640, top: 1040 + out * 200, width: 1280, height: 80, borderRadius: 24, background: "linear-gradient(180deg, #2a2e34, #121417)", boxShadow: "0 -10px 60px rgba(0,0,0,0.6)", opacity: pr(t, at - 0.5, 0.3) }}>
        <div style={{ position: "absolute", left: 40, right: 40, top: 14, height: 10, borderRadius: 5, background: "#050607" }} />
        <div style={{ position: "absolute", right: 46, top: 36, width: 14, height: 14, borderRadius: "50%", background: K.time, boxShadow: `0 0 16px ${K.time}` }} />
      </div>
    </AbsoluteFill>
  );
};
