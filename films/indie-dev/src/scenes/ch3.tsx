import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { gridPos, Shovel, Tile } from "../art";
import { At, CL, EBACK, EIO, EO, In, Kinetic, lerp, Odometer, progAt, Shockwave } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { FPB } from "../timing";
import { Src } from "../ui";

// ───────── 7. The one discovery: one founder at the top = 61 median founders ─────────
// Beats 0–12 sit on the breakdown, 12–16 on the build, the 61 lands on the re-entry (beat 16 = film bar 25).

const Delta: React.FC<{ x: number; at: number; label: string; to: number; color: string; up: boolean }> = ({ x, at, label, to, color, up }) => {
  const frame = useBeatFrame();
  const p = progAt(frame, at, 1.8, EIO);
  const v = to * p;
  return (
    <At x={x} y={560} center>
      <In at={at - 0.4} out={11.6} from="scale">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: `translateY(${(up ? -1 : 1) * 50 * p}px)` }}>
          <Tile size={120} tone={up ? "green" : "sleep"} mood={up ? "happy" : "sad"} />
          <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>{label}</div>
          <div style={{ fontFamily: FONT, fontSize: 170, fontWeight: 900, color, letterSpacing: -6, lineHeight: 1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {up ? "+" : "−"}
            {Math.round(Math.abs(v))}%<span style={{ fontSize: 100 }}>{up ? " ↑" : " ↓"}</span>
          </div>
        </div>
      </In>
    </At>
  );
};

const GAP_SIZE = 52;
const GAP_GAP = 12;
const GAP_POS = gridPos(65, 13, GAP_SIZE, GAP_GAP, 1080, 330);

export const Gap: React.FC = () => {
  const frame = useBeatFrame();
  const shown = frame < 16 * FPB ? Math.floor(interpolate(frame, [12.6 * FPB, 14.2 * FPB], [0, 34], CL)) : Math.floor(interpolate(frame, [16 * FPB, 17.6 * FPB], [34, 61], CL));
  const roll = interpolate(frame, [16 * FPB, 16.6 * FPB], [34, 61], { ...CL, easing: EO });
  const big = progAt(frame, 16, 0.5, EBACK);
  const pre = progAt(frame, 12.8, 0.6);
  return (
    <AbsoluteFill>
      {/* Breakdown: the two halves move apart */}
      <At x={960} y={160} center>
        <Kinetic at={0} out={11.6} size={72} parts={["单人创业公司，头 6 个月的收入"]} />
      </At>
      <At x={960} y={250} center>
        <In at={1} out={11.6}>
          <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>2025 年，比上一年</div>
        </In>
      </At>
      <Delta x={620} at={3} label="普通人（中位数）" to={23} color={K.red} up={false} />
      <Delta x={1300} at={6.5} label="前 10%" to={19} color={K.green} up={true} />
      {/* Build and re-entry: one gold tile against a growing crowd of median founders */}
      <At x={960} y={160} center>
        <Kinetic at={12} size={72} parts={["头部 1 个人赚的钱，顶普通人", { t: "几个", c: K.gold }, "？"]} />
      </At>
      <At x={330} y={520} center>
        <In at={12.2} from="scale">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <Tile size={190} tone="gold" mood="happy" crown glow={0.4 + 0.6 * big} />
            <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>头部 1 个人</div>
          </div>
        </In>
      </At>
      <At x={580} y={510} center>
        <In at={12.4} from="fade">
          <span style={{ fontFamily: FONT, fontSize: 120, fontWeight: 900, color: K.sub }}>=</span>
        </In>
      </At>
      {GAP_POS.map((p, i) => {
        if (i >= shown) return null;
        const t0 = i < 34 ? 12.6 + (i / 34) * 1.6 : 16 + ((i - 34) / 27) * 1.6;
        const e = progAt(frame, t0, 0.5, EBACK);
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, transform: `scale(${0.3 + 0.7 * e})`, opacity: Math.min(1, e * 2) }}>
            <Tile size={GAP_SIZE} tone="sleep" mood={i >= 34 ? "shock" : "idle"} />
          </div>
        );
      })}
      <At x={1080} y={720} center>
        <In at={12.8}>
          <div style={{ position: "relative", width: 600, height: 60, fontFamily: FONT, fontSize: 44, fontWeight: 700, whiteSpace: "nowrap" }}>
            <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", color: K.sub, opacity: 1 - big }}>四年前：普通人 34 个</span>
            <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", color: K.fg, opacity: big }}>2025 年：普通人 61 个</span>
          </div>
        </In>
      </At>
      <At x={1690} y={500} center>
        <div style={{ opacity: pre, display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
          <div style={{ transform: `scale(${frame >= 16 * FPB ? 1.5 - 0.5 * big : 1})`, transformOrigin: "50% 70%" }}>
            <Odometer value={roll} size={230} color={frame >= 16 * FPB ? K.gold : K.sub} />
          </div>
          <span style={{ fontFamily: FONT, fontSize: 70, fontWeight: 900, color: K.sub }}>个</span>
        </div>
      </At>
      <Shockwave at={16} x={1690} y={500} color={K.gold} size={1700} />
      <At x={960} y={880} center>
        <Kinetic at={24} size={84} parts={["钱，", { t: "越来越往头部走", c: K.gold }]} />
      </At>
      <Src>Stripe 2026 · Stripe Atlas 上数千家 2022–23 年成立的单人创始公司 · 头 6 个月收入 · 前 10% 与中位数之比</Src>
    </AbsoluteFill>
  );
};

// ───────── 8. Pieter Levels: 116 projects, 9 successes ─────────

const L_SIZE = 46;
const L_GAP = 10;
const L_POS = gridPos(116, 29, L_SIZE, L_GAP, 960, 330);
const L_WIN = Array.from({ length: 116 }, (_, i) => i).sort((a, b) => random(`l${a}`) - random(`l${b}`)).slice(0, 9);

export const Levels: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <At x={960} y={130} center>
        <In at={0}>
          <div style={{ fontFamily: FONT, fontSize: 42, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>最出名的独立开发者之一</div>
        </In>
      </At>
      <At x={960} y={215} center>
        <Kinetic at={0.4} size={84} parts={[{ t: "Pieter Levels", c: K.themeHi }]} />
      </At>
      {L_POS.map((p, i) => {
        const e = progAt(frame, 1 + (p.c + p.r * 3) * 0.04, 0.6, EBACK);
        const wi = L_WIN.indexOf(i);
        const won = wi >= 0 && frame >= (4 + wi * 0.25) * FPB;
        const wp = wi >= 0 ? progAt(frame, 4 + wi * 0.25, 0.5, EBACK) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, opacity: Math.min(1, e * 2), transform: `scale(${(0.4 + 0.6 * e) * (1 + 0.5 * wp * (1 - wp) * 4)})` }}>
            <Tile size={L_SIZE} tone={won ? "green" : "dark"} mood={won ? "happy" : "idle"} glow={won ? 0.7 : 0} />
          </div>
        );
      })}
      <At x={960} y={680} center>
        <Kinetic at={6.4} size={84} parts={["做了 116 个，成了 ", { t: "9", c: K.green }, " 个"]} />
      </At>
      <At x={960} y={790} center>
        <In at={7.6} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 500, color: K.muted, whiteSpace: "nowrap" }}>他自己的标注：成功 9 · 还行 11 · 失败 19 · 没标 71 · 新做的 6</div>
        </In>
      </At>
      <Src>Pieter Levels 本人项目页上的标注 · 2026-10-21</Src>
    </AbsoluteFill>
  );
};

// ───────── 9. idoubi: 11 products in 2024; the developer template sells $10,000 in 4 hours ─────────

const EARNING = new Set([1, 4, 6, 8]); // four of the ten earn a little (which four is not public; positions are illustrative)

export const Idoubi: React.FC = () => {
  const frame = useBeatFrame();
  const shipP = progAt(frame, 8, 0.8, EBACK);
  const money = interpolate(frame, [9.6 * FPB, 11.4 * FPB], [0, 10000], { ...CL, easing: EO });
  return (
    <AbsoluteFill>
      <At x={960} y={140} center>
        <Kinetic at={0} size={72} parts={[{ t: "idoubi", c: K.themeHi }, "：2024 年上线了 11 款 AI 产品"]} />
      </At>
      {/* The first ten, 5 × 2 on the left */}
      {gridPos(10, 5, 96, 22, 500, 280).map((p, i) => {
        const e = progAt(frame, 1 + i * 0.15, 0.6, EBACK);
        const sorted = frame >= 5 * FPB;
        const earning = EARNING.has(i);
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, opacity: Math.min(1, e * 2), transform: `scale(${0.4 + 0.6 * e})` }}>
            <Tile size={96} tone={sorted ? (earning ? "blue" : "sleep") : "blue"} mood={sorted ? (earning ? "idle" : "sleep") : "idle"} />
          </div>
        );
      })}
      <At x={500} y={560} center>
        <In at={5.2}>
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>到 12 月，其中 4 款加起来</div>
        </In>
      </At>
      <At x={500} y={665} center>
        <In at={5.8} from="scale">
          <div style={{ fontFamily: FONT, fontSize: 104, fontWeight: 900, color: K.fg, whiteSpace: "nowrap", letterSpacing: -3 }}>
            $1,000<span style={{ fontSize: 50, color: K.sub }}> / 月</span>
          </div>
        </In>
      </At>
      {/* The eleventh, a website template for developers */}
      <At x={1380} y={380} center>
        <div style={{ opacity: Math.min(1, progAt(frame, 2.5, 0.6) * 2), transform: `scale(${0.55 + 0.45 * shipP})` }}>
          <Tile size={200} tone={shipP > 0.3 ? "green" : "blue"} mood={shipP > 0.3 ? "happy" : "idle"} glow={shipP} />
        </div>
      </At>
      <At x={1380} y={560} center>
        <In at={8.2}>
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            第 11 款：卖给开发者的网站模板 <span style={{ color: K.fg }}>ShipAny</span>
          </div>
        </In>
      </At>
      <At x={1380} y={665} center>
        <In at={9.4} from="scale">
          <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Odometer value={money} size={120} prefix="$" color={K.green} />
            <span style={{ fontFamily: FONT, fontSize: 50, fontWeight: 900, color: K.sub }}> / 4 小时</span>
          </div>
        </In>
      </At>
      <At x={960} y={850} center>
        <In at={12} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 500, color: K.sub, whiteSpace: "nowrap" }}>他说：ShipAny 一周的收入，超过了其他产品一年的收入</div>
        </In>
      </At>
      <Src>idoubi《2024 年，我上线了 11 款 AI 产品》· 2025-01 · 本人自述</Src>
    </AbsoluteFill>
  );
};

// ───────── 10. The audience behind the template ─────────

const FOLLOWERS = Array.from({ length: 260 }, (_, k) => {
  const a = random(`fa${k}`) * Math.PI * 2;
  const r = 150 + Math.sqrt(random(`fr${k}`)) * 230;
  return { a, r, sx: random(`fsx${k}`) * 2200 - 140, sy: random(`fsy${k}`) < 0.5 ? -60 : 1140, t: 0.8 + random(`ft${k}`) * 3.6, s: 9 + random(`fs${k}`) * 9 };
});

export const Audience: React.FC = () => {
  const frame = useBeatFrame();
  const count = interpolate(frame, [1 * FPB, 5 * FPB], [0, 50000], { ...CL, easing: EO });
  const cx = 720;
  const cy = 500;
  return (
    <AbsoluteFill>
      {FOLLOWERS.map((f, k) => {
        const p = progAt(frame, f.t, 1.4, EIO);
        if (p <= 0) return null;
        const wob = Math.sin(frame / 9 + k) * 4;
        const x = lerp(f.sx, cx + Math.cos(f.a) * (f.r + wob), p);
        const y = lerp(f.sy, cy + Math.sin(f.a) * (f.r + wob) * 0.8, p);
        return <div key={k} style={{ position: "absolute", left: x, top: y, width: f.s, height: f.s, borderRadius: "50%", background: K.themeHi, opacity: 0.75 }} />;
      })}
      <At x={960} y={140} center>
        <Kinetic at={0} size={76} parts={["他说，这是", { t: "“影响力变现”", c: K.themeHi }]} />
      </At>
      <At x={cx} y={cy} center>
        <In at={0.2} from="scale">
          <Tile size={170} tone="green" mood="happy" glow={0.8} />
        </In>
      </At>
      <At x={1440} y={440} center>
        <In at={1}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>那时，多个平台加起来</div>
            <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
              <Odometer value={count} size={130} color={K.themeHi} />
              <span style={{ fontFamily: FONT, fontSize: 56, fontWeight: 900, color: K.sub }}>+ 关注</span>
            </div>
          </div>
        </In>
      </At>
      <At x={960} y={880} center>
        <Kinetic at={6.6} size={84} parts={["先有一群", { t: "信你的人", c: K.themeHi }]} />
      </At>
      <Src>idoubi《2024 年，我上线了 11 款 AI 产品》· 2025-01 · 本人自述</Src>
    </AbsoluteFill>
  );
};

// ───────── 11. Selling shovels: the template vs the sites built with it ─────────

const BASE = 760;
const MAX_H = 420;
const h = (v: number) => Math.max(4, (v / 20000) * MAX_H);

export const Shovels: React.FC = () => {
  const frame = useBeatFrame();
  const grow = progAt(frame, 1.2, 1.8, EO);
  const small = progAt(frame, 5, 0.8, EBACK);
  const v = 20000 * grow;
  const bar = (x: number, height: number, color: string, p: number) => (
    <div style={{ position: "absolute", left: x - 80, top: BASE - height * p, width: 160, height: height * p, borderRadius: "14px 14px 0 0", background: color }} />
  );
  return (
    <AbsoluteFill>
      <At x={960} y={140} center>
        <Kinetic at={0} size={72} parts={[{ t: "Fox", c: K.themeHi }, " 卖给开发者的网站模板"]} />
      </At>
      <At x={300} y={540} center>
        <In at={0.6} from="left">
          <Shovel size={300} />
        </In>
      </At>
      {bar(700, MAX_H, `linear-gradient(to top, ${K.green}aa, ${K.green})`, grow)}
      <At x={700} y={BASE - MAX_H * grow - 60} center>
        <div style={{ opacity: Math.min(1, grow * 3), fontFamily: FONT, fontSize: 84, fontWeight: 900, color: K.green, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>${Math.round(v).toLocaleString("en-US")}+</div>
      </At>
      <At x={700} y={BASE + 46} center>
        <In at={1.4}>
          <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>模板 · 2025 年 11 月，一个月</div>
        </In>
      </At>
      {[
        { x: 1180, v: 300 },
        { x: 1480, v: 30 },
      ].map((s, i) => (
        <React.Fragment key={i}>
          {bar(s.x, h(s.v), K.sub, small)}
          <At x={s.x} y={BASE - h(s.v) - 54} center>
            <div style={{ opacity: Math.min(1, small * 2), transform: `scale(${0.5 + 0.5 * small})` }}>
              <Tile size={84} tone="sleep" mood={i === 0 ? "sad" : "sleep"} />
            </div>
          </At>
          <At x={s.x} y={BASE - h(s.v) - 160} center>
            <div style={{ opacity: small, fontFamily: FONT, fontSize: 70, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>${s.v}</div>
          </At>
        </React.Fragment>
      ))}
      <At x={1330} y={BASE + 46} center>
        <In at={5.4}>
          <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>用这个模板做出来的两个站 · 每月</div>
        </In>
      </At>
      <div style={{ position: "absolute", left: 560, top: BASE, width: 1080, height: 3, background: K.line }} />
      <At x={960} y={910} center>
        <Kinetic at={9} size={84} parts={["淘金热里，最稳的是", { t: "卖铲子", c: K.themeHi }]} />
      </At>
      <Src>Fox《MkSaaS 2025 年总结》、MkSaaS 官网 · 2026 · 本人自述</Src>
    </AbsoluteFill>
  );
};
