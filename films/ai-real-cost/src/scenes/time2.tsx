import React from "react";
import { AbsoluteFill } from "remotion";
import { ClaudeGlyph, Clock, Coin, Receipt, RLine, Spark, Whale, WhaleGlyph, You } from "../art";
import { EBACK, EIN, EIO, EO, keys, Lab, lerp, Odometer, pr, Source, Stamp, useT } from "../kit";
import { K } from "../theme";
import { BAR, BEAT, FB } from "../timing";

// The second half of the "your time" chapter: hours, the counter-point, the price of an hour, the bill, the spread.

// ───────── 10. Hours: every check is five minutes ─────────

export const HOURS_AT = FB(44);
export const HOURS_END = FB(48);

export const Hours: React.FC = () => {
  const t = useT();
  const enter = pr(t, HOURS_AT - 0.1, 0.4, EO);
  const spin = pr(t, HOURS_AT + 0.1, 1.7, EIO);
  const exit = pr(t, HOURS_END - 0.3, 0.35, EIN);
  const extra = pr(t, HOURS_AT + 1.9, 0.5, EO);
  const day = pr(t, FB(46), 0.6, EO);
  const block = 50;
  const gap = 8;
  const rowW = 18 * (block + gap) - gap;
  const x0 = 960 - rowW / 2 - 120;
  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit), transform: `scale(${1 + 0.03 * pr(t, HOURS_AT, BAR * 4, (z) => z)})`, transformOrigin: "960px 640px" }}>
      {[
        { x: 520, h: 13.5 * spin, mins: 810 * spin, c: K.claudeHi, name: "Claude Opus 5.5" },
        { x: 1400, h: 18 * spin, mins: 1080 * spin, c: K.deepseekHi, name: "DeepSeek V4.1 Flash" },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", left: s.x - 200, top: 280, width: 400 }}>
          <Lab size={34} color={s.c} w={900} style={{ textAlign: "center", width: 400 }}>
            {s.name}
          </Lab>
          <div style={{ margin: "14px auto 0", width: 320 }}>
            <Clock size={320} minutes={s.mins} seconds={Math.floor((t - HOURS_AT) / BEAT)} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <Odometer value={s.h} decimals={1} size={100} color={K.timeHi} />
            <Lab size={40} color={K.sub}>小时</Lab>
          </div>
        </div>
      ))}
      {/* hour blocks: one block = one hour; an 8-hour working day is bracketed when the caption says so */}
      <div style={{ position: "absolute", left: x0, top: 836, opacity: pr(t, HOURS_AT + 0.4, 0.4) }}>
        {[13.5, 18].map((n, row) => (
          <div key={row} style={{ display: "flex", gap, marginBottom: 12, height: block * 0.8 }}>
            {Array.from({ length: 18 }).map((_, i) => {
              const fill = Math.max(0, Math.min(1, n * spin - i));
              const isExtra = row === 1 && i >= 13.5;
              return (
                <div key={i} style={{ width: block, height: block * 0.8, borderRadius: 7, background: "rgba(244,240,232,0.06)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: isExtra && extra > 0 ? K.red : row === 0 ? K.claude : K.deepseek, opacity: 0.9 }} />
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ position: "absolute", left: rowW + 24, top: 18, opacity: extra, whiteSpace: "nowrap" }}>
          <Lab size={40} color={K.red} w={900}>多 4.5 小时</Lab>
          <Lab size={28} color={K.sub} w={700}>= 54 次 × 5 分钟</Lab>
        </div>
        <div style={{ position: "absolute", left: 13.5 * (block + gap), top: 2 * (block * 0.8 + 12) + 4, width: 4 * (block + gap) - gap, height: 16, opacity: day, borderBottom: `4px solid ${K.gold}`, borderLeft: `4px solid ${K.gold}`, borderRight: `4px solid ${K.gold}` }}>
          <div style={{ position: "absolute", left: -60, right: -60, top: 24, textAlign: "center" }}>
            <Lab size={28} color={K.gold} w={700} style={{ textAlign: "center" }}>
              半个工作日 = 4 小时
            </Lab>
          </div>
        </div>
      </div>
      <Source o={1 - exit}>时间 = 检查次数 × 5 分钟（假设，往少了算）· 推算</Source>
    </AbsoluteFill>
  );
};

// ───────── 11. Counter-point: the smart one works slower. That is its time, not yours ─────────

export const MACH_AT = FB(48);
export const MACH_END = FB(52);

const RunBar: React.FC<{ t: number; at: number; mins: number; color: string; glyph: React.ReactNode; name: string }> = ({ t, at, mins, color, glyph, name }) => {
  const W = 1000;
  const full = (mins / 61) * W;
  const grow = pr(t, at, 1.6, EIO);
  const sh = ((t - at) * 0.5) % 1; // a glint runs along the bar while the AI works
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
      <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{glyph}</div>
      <div>
        <Lab size={30} color={color} w={900}>
          {name}
        </Lab>
        <div style={{ position: "relative", marginTop: 10, width: W, height: 44, borderRadius: 12, background: "rgba(244,240,232,0.06)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: full * grow, borderRadius: 12, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: full * grow * sh - 80, width: 80, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", opacity: grow }} />
        </div>
      </div>
      <Lab size={52} color={K.fg} w={900} style={{ opacity: grow, marginTop: 40 }}>
        约 {mins} 分钟
      </Lab>
    </div>
  );
};

export const Machine: React.FC = () => {
  const t = useT();
  const enter = pr(t, MACH_AT - 0.1, 0.45, EO);
  const exit = pr(t, MACH_END - 0.3, 0.35, EIN);
  const you = pr(t, FB(50), 0.6, EBACK);
  const steam = (k: number) => (t * 0.8 + k * 0.33) % 1;
  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit), transform: `translateX(${(1 - enter) * 120}px)` }}>
      <div style={{ position: "absolute", left: 140, top: 300 }}>
        <Lab size={30} color={K.muted} w={700}>AI 自己干一轮活要多久</Lab>
      </div>
      <div style={{ position: "absolute", left: 140, top: 380, display: "flex", flexDirection: "column", gap: 54 }}>
        <RunBar t={t} at={MACH_AT + 0.2} mins={61} color={K.claude} glyph={<ClaudeGlyph size={44} />} name="Claude Opus 5.5" />
        <RunBar t={t} at={MACH_AT + 0.4} mins={21} color={K.deepseek} glyph={<WhaleGlyph size={50} />} name="DeepSeek V4.1 Flash" />
      </div>
      <div style={{ position: "absolute", left: 640, top: 700 }}>
        <Stamp t={t} at={FB(50.5)} color={K.sub} size={58} rot={-5}>
          机器的时间
        </Stamp>
      </div>
      {/* you, with a cup of tea, off doing something else */}
      <div style={{ position: "absolute", left: 1480, top: lerp(1200, 560, you) }}>
        <You size={250} gaze={-0.5} worry={0} blinkT={t} />
        <div style={{ position: "absolute", left: 190, top: 200 }}>
          <svg width={90} height={100} viewBox="0 0 90 100" style={{ overflow: "visible" }}>
            {[0, 1, 2].map((k) => (
              <path key={k} d={`M${22 + k * 16} ${20 - steam(k) * 30} q6 -8 0 -16`} stroke="#d9d4c8" strokeWidth={4} fill="none" opacity={1 - steam(k)} strokeLinecap="round" />
            ))}
            <rect x={8} y={28} width={60} height={62} rx={10} fill={K.paper} />
            <path d="M68 42 q20 0 20 16 q0 16 -20 16" stroke={K.paper} strokeWidth={8} fill="none" />
          </svg>
        </div>
        <div style={{ position: "absolute", left: -40, top: 290, opacity: pr(t, FB(50) + 0.6, 0.4) }}>
          <Lab size={30} color={K.timeHi} w={700}>这段时间，你可以去干别的</Lab>
        </div>
      </div>
      <Source o={1 - exit}>Artificial Analysis 编程智能体榜 v2.0（2026-10-22）：AI 每轮自己运行的平均时长 Opus 5.5 约 61 分钟、DeepSeek V4.1 Flash 约 21 分钟 · 不含人检查的时间</Source>
    </AbsoluteFill>
  );
};

// ───────── 12. The price of one of your hours; then both go into the bill (the second silence) ─────────

export const PRICE_AT = FB(52);
export const COIN_DROP = FB(54);
export const BUILD_AT = FB(56);
export const HUSH_AT = FB(59);
export const PRICE_END = FB(60);

// Where each printer's slot sits on screen (the bill scene's printers are at the same place when it opens).
const SLOTS = [680, 1270];
export const CLOCK_IN = FB(56.5);
export const COIN_IN = FB(57.5);

export const Price: React.FC = () => {
  const t = useT();
  const enter = pr(t, PRICE_AT - 0.1, 0.45, EO);
  const coin = pr(t, COIN_DROP, 0.45, EBACK);
  const rise = pr(t, BUILD_AT, 0.6, EBACK);
  const clockFly = pr(t, CLOCK_IN, 0.8, EIO);
  const coinFly = pr(t, COIN_IN, 0.8, EIO);
  const hush = pr(t, HUSH_AT, BAR, EIO);
  const out = pr(t, PRICE_END - 0.15, 0.2, EIN);
  const clockMin = 9 * 60 + 41 + (t - PRICE_AT) * 6;
  const clockX = lerp(960 - 190, 380, coin);
  const coinX = 1270;
  const flash = (at: number) => Math.max(0, 1 - Math.abs(t - at) / 0.25);
  const PY = 720; // printer slot height on screen while they wait
  const paper = pr(t, COIN_IN + 0.9, HUSH_AT - COIN_IN - 0.9, (z) => z);
  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - out), transform: `scale(${1 + 0.08 * pr(t, BUILD_AT, BAR * 3, EIO) + hush * 0.1})`, transformOrigin: "960px 720px" }}>
      {/* your clock: whole until it splits into two that drop into the printers */}
      {clockFly < 1 ? (
        <div style={{ position: "absolute", left: clockX, top: lerp(300, 330, coin), opacity: 1 - clockFly }}>
          <Clock size={380} minutes={clockMin} seconds={Math.floor((t - PRICE_AT) / BEAT)} />
          <div style={{ position: "absolute", left: 0, width: 380, top: 396 }}>
            <Lab size={36} color={K.timeHi} w={900} style={{ textAlign: "center" }}>
              你的 1 小时
            </Lab>
          </div>
        </div>
      ) : null}
      {clockFly > 0 && clockFly < 1
        ? SLOTS.map((x, i) => (
            <div key={`c${i}`} style={{ position: "absolute", left: lerp(clockX + 190, x, clockFly) - 70, top: lerp(500, PY, clockFly) - 70, transform: `scale(${lerp(1, 0.45, clockFly)})` }}>
              <Clock size={140} minutes={clockMin} />
            </div>
          ))
        : null}
      {coin > 0 && coinFly < 1 ? (
        <div style={{ position: "absolute", left: coinX, top: lerp(-260, 420, coin), opacity: 1 - coinFly }}>
          <div style={{ transform: "scale(1.9)" }}>
            <Coin w={190} />
          </div>
          <div style={{ position: "absolute", left: -260, top: 96, width: 520, textAlign: "center" }}>
            <Lab size={110} color={K.gold} w={900} style={{ textAlign: "center", letterSpacing: -2 }}>
              约 ¥119
            </Lab>
            <Lab size={30} color={K.sub} style={{ textAlign: "center" }}>
              软件业平均工资，折成每小时
            </Lab>
          </div>
        </div>
      ) : null}
      {coinFly > 0 && coinFly < 1
        ? SLOTS.map((x, i) => (
            <div key={`m${i}`} style={{ position: "absolute", left: lerp(coinX, x, coinFly), top: lerp(440, PY - 10, coinFly), transform: `scale(${lerp(1.2, 0.5, coinFly)})` }}>
              <Coin w={190} />
            </div>
          ))
        : null}
      {/* the two printers rise for the bill, and light up as your time and its price go in */}
      {rise > 0
        ? SLOTS.map((x, i) => {
            const glow = flash(CLOCK_IN + 0.8) + flash(COIN_IN + 0.8);
            return (
              <div key={i} style={{ position: "absolute", left: x - 300, top: lerp(1180, PY, rise), width: 600, height: 70, borderRadius: 20, background: "linear-gradient(180deg, #2a2e34, #121417)", boxShadow: `0 20px 50px rgba(0,0,0,0.7), 0 0 ${70 * glow}px ${K.time}` }}>
                {/* the paper edge starts to come out, then stops in the silence */}
                <div style={{ position: "absolute", left: 40, right: 40, bottom: 58, height: 70 * paper, background: K.receipt, clipPath: "polygon(0 12px, 5% 0, 10% 12px, 15% 0, 20% 12px, 25% 0, 30% 12px, 35% 0, 40% 12px, 45% 0, 50% 12px, 55% 0, 60% 12px, 65% 0, 70% 12px, 75% 0, 80% 12px, 85% 0, 90% 12px, 95% 0, 100% 12px, 100% 100%, 0 100%)" }} />
                <div style={{ position: "absolute", left: 24, right: 24, top: 12, height: 10, borderRadius: 5, background: "#050607" }} />
                <div style={{ position: "absolute", right: 26, bottom: 14, width: 14, height: 14, borderRadius: "50%", background: i ? K.deepseek : K.claude, opacity: Math.floor(t * 3) % 2 ? 1 : 0.35, boxShadow: `0 0 14px ${i ? K.deepseek : K.claude}` }} />
                <div style={{ position: "absolute", left: 26, bottom: 10, fontFamily: "inherit", opacity: pr(t, BUILD_AT + 0.4, 0.4) }}>
                  <Lab size={22} color={i ? K.deepseekHi : K.claudeHi} w={900}>
                    {i ? "DEEPSEEK" : "CLAUDE"}
                  </Lab>
                </div>
              </div>
            );
          })
        : null}
      <Source o={(1 - out) * (1 - rise)}>
        国家统计局：2025 年城镇非私营单位"信息传输、软件和信息技术服务业"平均工资 248,752 元 ÷ 12 ÷ 21.75 天 ÷ 8 小时（人社部发〔2025〕2 号的折算办法）≈ ¥119/小时（推算）
      </Source>
    </AbsoluteFill>
  );
};

// ───────── 13. The bill: two receipts print at once; your time is the longest line by far ─────────

export const BILL_AT = FB(60);
export const BILL_END = FB(68);
const KY = 0.2; // px per yuan on the bars
export const BILL_C: RLine[] = [
  { k: "head", text: "CLAUDE OPUS 5.5", sub: "包月用满 · 100 个编程任务" },
  { k: "bar", l: "token", r: "¥346", color: K.claude, h: 346 * KY },
  { k: "bar", l: "你的时间 · 13.5 小时", r: "¥1,610", color: K.time, h: 1610 * KY, note: "检查 162 次" },
  { k: "rule" },
  { k: "total", l: "合计", r: "¥1,956", color: K.greenDeep },
];
export const BILL_D: RLine[] = [
  { k: "head", text: "DEEPSEEK V4.1 FLASH", sub: "闲时价 · 100 个编程任务" },
  { k: "bar", l: "token", r: "¥213", color: K.deepseek, h: 213 * KY },
  { k: "bar", l: "你的时间 · 18 小时", r: "¥2,144", color: K.time, h: 2144 * KY, note: "检查 216 次" },
  { k: "rule" },
  { k: "total", l: "合计", r: "¥2,357", color: K.ink },
];
// line start times and how long each feeds
export const BILL_LINES: [number, number][] = [
  [BILL_AT, 0.12],
  [BILL_AT + BEAT, 0.3],
  [BILL_AT + 2 * BEAT, FB(62) - BILL_AT - 2 * BEAT - 0.1],
  [FB(62), 0.1],
  [FB(62) + 0.12, 0.2],
];
export const SHARE_AT = FB(64.5);
export const SAVE_AT = FB(66.5);

const billPrinted = (t: number) => BILL_LINES.reduce((a, [s, d]) => a + pr(t, s, d, (z) => z), 0);

export const Bill: React.FC = () => {
  const t = useT();
  const enter = pr(t, BILL_AT - 0.15, 0.2, EO);
  const n = billPrinted(t);
  // Halfway through, the camera moves in on the two purple "your time" bars (the side totals step back), then pulls
  // out again for the saving.
  const cam = keys(t, [[BILL_AT, 1.3], [FB(60.75), 1.2], [FB(61.75), 0.8], [FB(63.75), 0.82], [FB(64.4), 1.12], [FB(65.7), 1.16], [FB(66.3), 0.78], [BILL_END, 0.74]], EIO);
  const sideDim = pr(t, FB(63.8), 0.5, EIO) - pr(t, FB(65.9), 0.4, EIO);
  const out = pr(t, BILL_END - 0.5, 0.6, EIO);
  const tot = pr(t, FB(62), 0.5, EBACK);
  const cx = 680;
  const dx = 1270;
  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <AbsoluteFill style={{ transform: `scale(${cam}) translateY(${-out * 140}px)`, transformOrigin: "960px 1050px", opacity: 1 - out * 0.9 }}>
        <div style={{ position: "absolute", left: cx - 295, top: 1050 }}>
          <Receipt lines={BILL_C} printed={n} w={520} s={1.12} accent={K.claude} label="CLAUDE" glow={pr(t, SAVE_AT, 0.4) * 0.6} />
        </div>
        <div style={{ position: "absolute", left: dx - 295, top: 1050 }}>
          <Receipt lines={BILL_D} printed={n} w={520} s={1.12} accent={K.deepseek} label="DEEPSEEK" />
        </div>
        <div style={{ position: "absolute", left: cx - 150, top: 1050 - 360 }}>
          <Stamp t={t} at={SHARE_AT} color={K.time} size={64} rot={-7}>
            占 8 成
          </Stamp>
        </div>
        <div style={{ position: "absolute", left: dx - 150, top: 1050 - 400 }}>
          <Stamp t={t} at={SHARE_AT + 0.2} color={K.time} size={64} rot={6}>
            占 9 成
          </Stamp>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 400, opacity: Math.min(1, tot * 2) * (1 - out) * (1 - 0.9 * sideDim), transform: `translateY(${(1 - tot) * 30}px)` }}>
        <Lab size={30} color={K.claudeHi} w={900}>Claude Opus 5.5</Lab>
        <Lab size={26} color={K.claudeHi} w={700}>包月用满</Lab>
        <Lab size={30} color={K.sub} w={700} style={{ marginTop: 6 }}>合计</Lab>
        <Lab size={112} color={K.green} w={900} style={{ letterSpacing: -3 }}>¥1,956</Lab>
        <div style={{ marginTop: 18, marginLeft: 6 }}>
          <Stamp t={t} at={SAVE_AT} color={K.green} size={66} rot={-7}>
            便宜 ¥400
          </Stamp>
        </div>
      </div>
      <div style={{ position: "absolute", left: 1480, top: 400, opacity: Math.min(1, tot * 2) * (1 - out) * (1 - 0.9 * sideDim), transform: `translateY(${(1 - tot) * 30}px)` }}>
        <Lab size={30} color={K.deepseekHi} w={900}>DeepSeek V4.1 Flash</Lab>
        <Lab size={26} color={K.deepseekHi} w={700}>闲时价</Lab>
        <Lab size={30} color={K.sub} w={700} style={{ marginTop: 6 }}>合计</Lab>
        <Lab size={112} color={K.fg} w={900} style={{ letterSpacing: -3 }}>¥2,357</Lab>
      </div>
      <div style={{ position: "absolute", left: 40, top: lerp(1200, 850, pr(t, BILL_AT + 0.5, 0.5, EBACK)) + out * 300 + sideDim * 300 }}>
        <Spark t={t} size={150} mood={t > SAVE_AT ? "party" : "happy"} beat={BEAT} />
      </div>
      <div style={{ position: "absolute", left: 1680, top: lerp(1200, 860, pr(t, BILL_AT + 0.7, 0.5, EBACK)) + out * 300 + sideDim * 300 }}>
        <Whale t={t} size={200} mood={t > SHARE_AT ? "sweat" : "happy"} beat={BEAT} />
      </div>
      <Source o={(1 - out) * pr(t, BILL_AT + 0.5, 0.5)}>
        token：AA 实测每轮花费 × 检查次数 · Opus 按 Max 包月用满折算（÷36；按 API 原价约 ¥1.25 万）· DeepSeek 按闲时价 · 你的时间 = 小时 × ¥119 · 均为推算，按 2026-10-22 中间价换算
      </Source>
    </AbsoluteFill>
  );
};

// ───────── 14. The average hides the spread: on work the AI does by itself, the gap doubles ─────────

export const HARD_AT = FB(68);
export const HARD_END = FB(72);
export const HARD = [
  { l: "读代码、回答问题", c: 152, d: 162, at: FB(68.5) },
  { l: "自己动手、一步步操作电脑", c: 158, d: 325, at: FB(70) },
];

export const Hard: React.FC = () => {
  const t = useT();
  const enter = pr(t, HARD_AT - 0.1, 0.45, EO);
  const exit = pr(t, HARD_END - 0.35, 0.4, EIN);
  const PX = 2.6; // px per check
  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <div style={{ position: "absolute", left: 140, top: 300 }}>
        <Lab size={30} color={K.muted} w={700}>各做 100 个任务，你要检查几次</Lab>
      </div>
      {HARD.map((r, i) => {
        const g = pr(t, r.at, 1.0, EIO);
        return (
          <div key={i} style={{ position: "absolute", left: 140, top: 370 + i * 300, opacity: pr(t, r.at - 0.3, 0.3) }}>
            <Lab size={44} color={K.fg} w={900}>
              {r.l}
            </Lab>
            {[
              { v: r.c, color: K.claude, n: "Claude" },
              { v: r.d, color: K.deepseek, n: "DeepSeek" },
            ].map((b, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: j ? 10 : 18 }}>
                <Lab size={26} color={b.color} w={900} style={{ width: 140 }}>
                  {b.n}
                </Lab>
                <div style={{ width: b.v * PX * g, height: 46, borderRadius: 10, background: `linear-gradient(90deg, ${b.color}99, ${b.color})` }} />
                <Odometer value={b.v * g} size={52} color={K.fg} />
                <Lab size={28} color={K.sub}>
                  次
                </Lab>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1400, top: 640 }}>
        <Stamp t={t} at={FB(71)} color={K.red} size={70} rot={-7}>
          多一倍
        </Stamp>
        <div style={{ marginTop: 16, opacity: pr(t, FB(71) + 0.3, 0.4) }}>
          <Lab size={34} color={K.red} w={900}>
            ≈ 多盯 14 个小时
          </Lab>
        </div>
      </div>
      <Source o={1 - exit}>
        Artificial Analysis 编程智能体榜 v2.0 分项：读代码答题（SWE-Atlas QnA）一次做对 65.9% / 61.6%；操作电脑（Terminal-Bench 4.0）63.1% / 30.8% · 检查次数 = 100 ÷ 一次做对的比例（推算）
      </Source>
    </AbsoluteFill>
  );
};
