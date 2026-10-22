import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { CL, EBACK, EIO, EO, Glass, In, Odometer, progAt, Tag } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, MONO, SERIF } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";

// ---------- S05 · one person and ~100 agents: the CodexBar panel, recreated ----------

const ROWS: { k: string; v: number; fmt: (n: number) => string; at: number; hi?: boolean }[] = [
  { k: "30 天花费", v: 1305088.81, fmt: (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, at: 2, hi: true },
  { k: "30 天 token", v: 603, fmt: (n) => `${Math.round(n)}B`, at: 2.6, hi: true },
  { k: "30 天请求", v: 7.6, fmt: (n) => `${n.toFixed(1)}M`, at: 3.1 },
  { k: "7 天花费", v: 249661.09, fmt: (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, at: 3.6 },
  { k: "今天", v: 19985.84, fmt: (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · 19B`, at: 4.1 },
];

const Bar: React.FC = () => (
  <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 40, background: "rgba(30,32,38,0.92)", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 22, padding: "0 18px", fontFamily: FONT, fontSize: 17, color: "#d9d9de" }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 6, background: "rgba(155,135,255,0.35)" }}>
      <svg width="18" height="14" viewBox="0 0 18 14">
        <path d="M2 12 A7 7 0 0 1 16 12" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M9 12 L13 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      CodexBar
    </span>
    <span style={{ opacity: 0.7 }}>◔</span>
    <span style={{ opacity: 0.7 }}>▮▮▮</span>
    <span style={{ opacity: 0.85 }}>5月15日 周五</span>
  </div>
);

const Agents: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const frame = useBeatFrame();
  const lit = interpolate(frame, [1 * FPB, 6 * FPB], [0, 100], CL);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 800, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {Array.from({ length: 100 }, (_, i) => {
        const on = i < lit;
        const r = random(`ag${i}`);
        const blink = on && ((frame + Math.floor(r * 40)) % 46) < 6;
        const speed = 0.4 + r * 0.6;
        return (
          <div
            key={i}
            style={{
              width: 72,
              height: 40,
              borderRadius: 6,
              background: on ? "#141224" : "#0f1013",
              border: `1px solid ${on ? K.ai + "88" : "#24262c"}`,
              position: "relative",
              overflow: "hidden",
              boxShadow: on ? `0 0 14px ${K.ai}33` : undefined,
            }}
          >
            {on ? (
              <>
                {[0, 1, 2, 3].map((l) => (
                  <div key={l} style={{ position: "absolute", left: 7, top: 2 + ((l * 8 + frame * speed) % 32), width: 18 + random(`agw${i}-${l}`) * 40, height: 3, borderRadius: 2, background: K.ai, opacity: 0.75 }} />
                ))}
                <div style={{ position: "absolute", right: 5, top: 5, width: 7, height: 7, borderRadius: "50%", background: blink ? K.green : K.ai + "66" }} />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const OnePerson: React.FC = () => {
  const frame = useBeatFrame();
  const panel = progAt(frame, 1.2, 0.8, EBACK);
  const ladder = progAt(frame, 10, 1.2, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 118, display: "flex", flexDirection: "column", gap: 10 }}>
        <Head at={0} parts={["一个人，加上约 ", { t: "100 个 AI", c: K.aiHi }, "："]} size={70} />
        <Head at={8} parts={["30 天，烧掉 ", { t: "130 万美元", c: K.aiHi }, " 的 token。"]} size={70} />
      </div>
      <In at={1.5} from="fade">
        <div style={{ position: "absolute", left: 1060, top: 146, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>Peter Steinberger · OpenClaw 作者</div>
      </In>
      {/* The menu bar and the CodexBar panel */}
      <div style={{ position: "absolute", left: 110, top: 300, width: 840, height: 446, opacity: Math.min(1, panel * 2), transform: `translateY(${(1 - panel) * 40}px)` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "linear-gradient(160deg, #1b1d2b, #0d0e14)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <Bar />
        <div style={{ position: "absolute", left: 300, top: 50, width: 520, borderRadius: 14, background: "rgba(36,38,46,0.97)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", padding: "18px 24px", fontFamily: FONT, color: "#ececf1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>OpenAI API</span>
            <span style={{ fontSize: 15, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "rgba(255,255,255,0.12)" }}>Admin</span>
          </div>
          {ROWS.map((r) => {
            const p = progAt(frame, r.at, 1.4, EO);
            return (
              <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderTop: "1px solid rgba(255,255,255,0.07)", opacity: p > 0 ? 1 : 0.15 }}>
                <span style={{ fontSize: 22, color: "#a9a9b4" }}>{r.k}</span>
                <span style={{ fontSize: r.hi ? 34 : 26, fontWeight: 900, color: r.hi ? K.aiHi : "#ececf1", fontVariantNumeric: "tabular-nums" }}>{r.fmt(r.v * p)}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: 22, color: "#a9a9b4" }}>主力模型</span>
            <span style={{ fontFamily: MONO, fontSize: 22, color: "#ececf1" }}>gpt-5.5</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 24, bottom: 18, width: 250, fontFamily: FONT, fontSize: 17, color: K.muted, lineHeight: 1.5 }}>复刻自他本人 2026-05-15 发布的 CodexBar 用量截图</div>
      </div>
      {/* ~100 Codex agents in the cloud */}
      <In at={1} from="fade">
        <div style={{ position: "absolute", left: 1010, top: 252, fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.sub }}>约 100 个 Codex，常驻云端</div>
      </In>
      <Agents x={1010} y={300} />
      <div style={{ position: "absolute", left: 1010, top: 790, display: "flex", gap: 12 }}>
        {["审每一个 PR", "查每一个 issue", "每次提交做安全检查"].map((t, i) => (
          <In key={t} at={5.5 + i * 0.5} from="up" dist={20}>
            <Tag color={K.ai} size={24}>
              {t}
            </Tag>
          </In>
        ))}
      </div>
      {/* Per-day ladder: an average enterprise developer vs him (different bases; flagged) */}
      <div style={{ position: "absolute", left: 110, top: 860, width: 1700, opacity: ladder }}>
        {[
          { l: "企业开发者平均", v: 13, s: "约 $13 / 天", note: "Claude Code 企业部署 · Anthropic 自己的数据", c: K.sub },
          { l: "他", v: 43500, s: "约 $43,500 / 天", note: "推算：30 天 ÷ 30 · 三人团队的组织账号", c: K.ai },
        ].map((r, i) => (
          <div key={r.l} style={{ display: "flex", alignItems: "center", height: 44, fontFamily: FONT }}>
            <div style={{ width: 230, fontSize: 24, fontWeight: 700, color: K.fg, textAlign: "right", paddingRight: 18 }}>{r.l}</div>
            <div style={{ width: Math.max(5, (r.v / 43500) * 980 * progAt(frame, 10 + i * 0.6, 1.4, EIO)), height: 22, borderRadius: 5, background: r.c }} />
            <div style={{ paddingLeft: 16, fontSize: 26, fontWeight: 900, color: r.c, whiteSpace: "nowrap" }}>{r.s}</div>
            <div style={{ paddingLeft: 14, fontSize: 18, color: K.muted, whiteSpace: "nowrap" }}>{r.note}</div>
          </div>
        ))}
      </div>
      <Src>他现为 OpenAI 员工，费用由 OpenAI 承担；含 Fast 模式溢价，他说关掉能省 70% · 截图 2026-05-15 · The Decoder 2026-05-16</Src>
    </AbsoluteFill>
  );
};

// ---------- S06 · into books: one day of his tokens ≈ 46,000 copies of 《红楼梦》 ----------

const BOOKS = 46232;
const PER = 100;
const CELLS = Math.ceil(BOOKS / PER); // 463
const WCOLS = 23;

// One thread-bound volume lying flat: indigo cloth, a paper title slip, stitching on the spine side.
export const Volume: React.FC<{ w: number; h: number; label?: boolean; style?: React.CSSProperties }> = ({ w, h, label = false, style }) => (
  <div style={{ position: "relative", width: w, height: h, background: `linear-gradient(180deg, #2f4670, ${K.cloth})`, borderRadius: 2, boxShadow: "0 2px 0 rgba(0,0,0,0.35)", ...style }}>
    <div style={{ position: "absolute", left: w * 0.12, top: h * 0.18, width: w * 0.2, height: h * 0.64, background: K.paper, opacity: 0.9 }}>
      {label ? <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: w * 0.13, color: K.ink, writingMode: "vertical-rl", padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>紅樓夢</div> : null}
    </div>
    {[0.82, 0.88, 0.94].map((p) => (
      <div key={p} style={{ position: "absolute", left: w * p, top: 0, bottom: 0, width: Math.max(1, w * 0.012), background: "rgba(241,236,223,0.55)" }} />
    ))}
  </div>
);

export const Books: React.FC = () => {
  const frame = useBeatFrame();
  const fill = interpolate(frame, [3 * FPB, 11 * FPB], [0, 1], { ...CL, easing: EIO });
  const lit = fill * CELLS;
  const cw = 54;
  const ch = 24;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 118 }}>
        <Head at={0} parts={["折成书：一部《红楼梦》"]} size={62} />
      </div>
      {/* The conversion, every step on screen */}
      <div style={{ position: "absolute", left: 110, top: 214, display: "flex", alignItems: "center", gap: 26, fontFamily: FONT, color: K.fg }}>
        <In at={0.5} from="scale">
          <Volume w={150} h={92} label />
        </In>
        {[
          { at: 1, big: "72.5 万字", small: "120 回，自数，不含标点" },
          { at: 2, big: "× 0.6", small: "DeepSeek 官方：1 个汉字 ≈ 0.6 token" },
          { at: 3, big: "≈ 43.5 万 token", small: "推算" },
        ].map((s, i) => (
          <In key={i} at={s.at} from="left" dist={24}>
            <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
              <span style={{ fontSize: 44, color: K.muted }}>{i === 0 ? "=" : i === 2 ? "" : ""}</span>
              <div>
                <div style={{ fontSize: 48, fontWeight: 900, whiteSpace: "nowrap", color: i === 2 ? K.aiHi : K.fg }}>{s.big}</div>
                <div style={{ fontSize: 19, color: K.muted, whiteSpace: "nowrap" }}>{s.small}</div>
              </div>
            </div>
          </In>
        ))}
      </div>
      {/* The wall: each volume stands for 100 copies */}
      <div style={{ position: "absolute", left: 110, top: 372, width: WCOLS * cw, display: "flex", flexWrap: "wrap", gap: 0 }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const on = i < lit;
          const edge = on && i > lit - 6;
          return (
            <div key={i} style={{ width: cw, height: ch, padding: 2, boxSizing: "border-box" }}>
              {on ? (
                <Volume w={cw - 4} h={ch - 4} style={{ opacity: edge ? 0.6 : 1 }} />
              ) : (
                <div style={{ width: cw - 4, height: ch - 4, border: "1px solid rgba(244,240,232,0.06)", borderRadius: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 110, top: 896, fontFamily: FONT, fontSize: 20, color: K.muted }}>每本 = 100 部《红楼梦》</div>
      {/* The readout */}
      <div style={{ position: "absolute", left: 1400, top: 380, width: 440, display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
        <In at={3} from="fade">
          <div style={{ fontSize: 30, fontWeight: 700, color: K.sub }}>他一天：约 200 亿 token</div>
        </In>
        <Odometer value={BOOKS * fill} size={120} color={K.aiHi} />
        <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>部《红楼梦》</div>
        <In at={11} from="up">
          <div style={{ marginTop: 28, fontSize: 52, fontWeight: 900, color: K.fg, lineHeight: 1.2 }}>
            一天，约 <span style={{ color: K.aiHi }}>4.6 万部</span>。
          </div>
        </In>
        <In at={12} from="fade">
          <div style={{ fontSize: 20, color: K.muted, lineHeight: 1.5 }}>token 里大部分是反复读取的上下文，不全是新写出来的字</div>
        </In>
      </div>
      <Src>推算：603B ÷ 30 天 ≈ 201 亿 token/天；《红楼梦》724,619 字 × 0.6 ≈ 43.5 万 token/部（Project Gutenberg 本）</Src>
    </AbsoluteFill>
  );
};

// ---------- S07 · a whole platform: 豆包's daily tokens, linear axis ----------

const PTS = [
  { m: 0, v: 0.12, l: "1,200 亿", d: "2024-05" },
  { m: 16, v: 30, l: "30 万亿", d: "2025-09" },
  { m: 22, v: 120, l: "120 万亿", d: "2026-03" },
  { m: 25, v: 180, l: "180 万亿", d: "2026-06" },
];

export const Platform: React.FC = () => {
  const frame = useBeatFrame();
  const X0 = 210;
  const X1 = 1210;
  const Y0 = 900;
  const Y1 = 330;
  const px = (m: number) => X0 + (m / 25) * (X1 - X0);
  const py = (v: number) => Y0 - (v / 200) * (Y0 - Y1);
  const draw = progAt(frame, 1, 4.6, EIO);
  // Piecewise path revealed by x
  const xMax = X0 + draw * (X1 - X0);
  const pts = PTS.map((p) => [px(p.m), py(p.v)] as [number, number]);
  const vis: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    if (bx <= xMax) vis.push([bx, by]);
    else {
      if (xMax > ax) vis.push([xMax, ay + ((xMax - ax) / (bx - ax)) * (by - ay)]);
      break;
    }
  }
  const line = `M${vis.map(([x, y]) => `${x} ${y}`).join(" L")}`;
  const area = `${line} L${vis[vis.length - 1][0]} ${Y0} L${X0} ${Y0} Z`;
  const secs = Math.max(0, (frame - 8 * FPB) / 30);
  const per = 4792;
  const big = progAt(frame, 6, 0.6, EBACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 118 }}>
        <Head at={0} parts={["放大到一个平台：", { t: "豆包", c: K.aiHi }, "每天处理的 token"]} size={62} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="dbArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={K.ai} stopOpacity="0.45" />
            <stop offset="1" stopColor={K.ai} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 50, 100, 150, 200].map((v) => (
          <line key={v} x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke="rgba(244,240,232,0.10)" strokeWidth={1.5} />
        ))}
        <path d={area} fill="url(#dbArea)" />
        <path d={line} fill="none" stroke={K.aiHi} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        {PTS.map((p, i) => {
          const q = progAt(frame, 1 + (p.m / 25) * 4.6, 0.5, EBACK);
          return q > 0 ? <circle key={i} cx={px(p.m)} cy={py(p.v)} r={9 * q} fill={K.bg} stroke={K.aiHi} strokeWidth={4} /> : null;
        })}
      </svg>
      {[0, 50, 100, 150, 200].map((v) => (
        <div key={v} style={{ position: "absolute", left: 90, width: 100, top: py(v) - 14, textAlign: "right", fontFamily: FONT, fontSize: 20, color: K.muted }}>
          {v === 0 ? "0" : `${v} 万亿`}
        </div>
      ))}
      {PTS.map((p, i) => {
        const q = progAt(frame, 1 + (p.m / 25) * 4.6, 0.5, EO);
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: px(p.m) - 60, width: 120, top: Y0 + 14, textAlign: "center", fontFamily: FONT, fontSize: 20, color: K.muted, opacity: q }}>{p.d}</div>
            <div
              style={{
                position: "absolute",
                left: px(p.m) + (i === 0 ? 14 : -150),
                width: 136,
                textAlign: i === 0 ? "left" : "right",
                top: py(p.v) - (i === 0 ? 50 : 54),
                fontFamily: FONT,
                fontSize: i === 3 ? 34 : 26,
                fontWeight: 900,
                color: i === 3 ? K.aiHi : K.fg,
                opacity: q,
                whiteSpace: "nowrap",
              }}
            >
              {p.l}
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: 300, top: 420, fontFamily: FONT, color: K.fg, opacity: Math.min(1, big * 1.5), transform: `scale(${0.8 + 0.2 * big})`, transformOrigin: "0 50%" }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: K.sub }}>两年</div>
        <div style={{ fontSize: 150, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>
          1500<span style={{ fontSize: 80 }}> 倍</span>
        </div>
      </div>
      {/* Right column: the live counter and two more platforms */}
      <div style={{ position: "absolute", left: 1300, top: 250, width: 540, display: "flex", flexDirection: "column", gap: 22 }}>
        <In at={8} from="right">
          <Glass style={{ padding: "22px 28px" }} glow={K.ai}>
            <div style={{ fontSize: 24, color: K.sub, fontWeight: 700 }}>按这个量，每过一秒：</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: K.aiHi }}>+</span>
              <Odometer value={per * secs} size={84} color={K.aiHi} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 900 }}>部《红楼梦》 ≈ 每秒 4,800 部</div>
            <div style={{ fontSize: 17, color: K.muted, marginTop: 6 }}>推算：180 万亿 ÷ 86,400 秒 ÷ 43.5 万 token/部</div>
          </Glass>
        </In>
        <In at={10} from="right">
          <Glass style={{ padding: "18px 28px" }}>
            <div style={{ fontSize: 22, color: K.sub, fontWeight: 700 }}>Google · 每月</div>
            <div style={{ fontSize: 44, fontWeight: 900 }}>3.2 千万亿 token</div>
            <div style={{ fontSize: 19, color: K.muted }}>2026-05；两年前是 9.7 万亿 · 公司称</div>
          </Glass>
        </In>
        <In at={11.5} from="right">
          <Glass style={{ padding: "18px 28px" }}>
            <div style={{ fontSize: 22, color: K.sub, fontWeight: 700 }}>中国全国 · 每天</div>
            <div style={{ fontSize: 44, fontWeight: 900 }}>140 万亿 token</div>
            <div style={{ fontSize: 19, color: K.muted }}>2026-03 · 国家数据局</div>
          </Glass>
        </In>
      </div>
      <Src>火山引擎 FORCE 大会 2026-06-23（谭待）· Google I/O 2026-05-19 · 新华社 2026-03-24 · 各家口径不同，不能相加</Src>
    </AbsoluteFill>
  );
};
