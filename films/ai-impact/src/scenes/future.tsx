import React from "react";
import { AbsoluteFill } from "remotion";
import { lin } from "../charts";
import { AGI_RULER, T1 } from "../data";
import { EBACK, EIO, EO, Glass, In, progAt } from "../fx";
import { Stamp, useBeatFrame } from "../kit";
import { laneRect, Lanes, LANE_BOX } from "../lanes";
import { FONT, K, LANES } from "../theme";
import { Head, Src } from "../ui";

const HEAD = { position: "absolute", left: 120, top: 128 } as const;

// ───────── 05-1 The fan: the four lines cross "today" and open into forecasts ─────────

const FAN_BOX = { ...LANE_BOX, w: 1040, y: 310, h: 590 };
const FORECASTS = [
  { t: "2027 年：四大云资本开支", v: "超过 1 万亿美元/年", who: "BofA、Evercore 预测" },
  { t: "2027–2028 年：内存", v: "比今年还紧", who: "美光管理层，2026-09" },
  { t: "2030 年：数据中心用电", v: "约 945 TWh ≈ 日本全国", who: "IEA 基准情景" },
  { t: "1–5 年内（2025-05 说）", v: "一半入门级白领岗位受冲击", who: "Amodei，Anthropic CEO · 卖 AI 的人" },
];

export const Fan: React.FC = () => {
  const frame = useBeatFrame();
  const end = 2030.6;
  const grow = progAt(frame, 0.3, 1.6, EIO);
  const domainEnd = T1 + 0.1 + (end - T1 - 0.1) * grow;
  const fan = progAt(frame, 1.8, 2.2, EO);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["下一个四年，", { t: "四条线会走到哪", c: K.theme }, "？"]} />
      </div>
      <Lanes box={FAN_BOX} domainEnd={domainEnd} fan={fan} stations={0} />
      {LANES.map((l, i) => {
        const r = laneRect(i, FAN_BOX);
        const f = FORECASTS[i];
        return (
          <In key={l.key} at={2.6 + i * 0.6} from="right" style={{ position: "absolute", left: FAN_BOX.x + FAN_BOX.w + 30, top: r.y + 2 }}>
            <div style={{ width: 430, height: r.h - 4, borderLeft: `4px solid ${l.color}`, paddingLeft: 18, fontFamily: FONT, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 21, fontWeight: 700, color: K.sub }}>{f.t}</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: l.color, whiteSpace: "nowrap" }}>{f.v}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: K.muted }}>预测 · {f.who}</div>
            </div>
          </In>
        );
      })}
      <div style={{ position: "absolute", left: FAN_BOX.x + FAN_BOX.w - 300, top: FAN_BOX.y - 50, fontFamily: FONT, fontSize: 21, fontWeight: 700, color: K.muted, opacity: fan, whiteSpace: "nowrap" }}>今天以后：扇面只表示"越远越不确定"，不按比例</div>
      <Src>BofA、Evercore（经 DCD、Moody's 汇总）· 美光 FQ4-2026 讲稿 · IEA《Energy and AI》2025 · Amodei 接受 Axios 采访 2025-05-28（本片作者是 Anthropic 的模型）</Src>
    </AbsoluteFill>
  );
};

// ───────── 05-2 The AGI ruler: the same question, answers 15+ years apart ─────────

export const Ruler: React.FC = () => {
  const frame = useBeatFrame();
  const x0 = 170;
  const x1 = 1750;
  const sx = lin(2026, 2051, x0, x1);
  const y = 560;
  const bar = progAt(frame, 0.3, 1, EIO);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["AGI 什么时候来？说法差了", { t: "15 年以上", c: K.theme }, "。"]} />
      </div>
      <div style={{ position: "absolute", left: x0, top: y, width: (x1 - x0) * bar, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${K.theme}, ${K.theme}22)` }} />
      {[2026, 2030, 2035, 2040, 2045, 2050].map((yv) => (
        <div key={yv} style={{ position: "absolute", left: sx(yv), top: y + 18, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.muted, opacity: bar }}>
          {yv}
        </div>
      ))}
      {AGI_RULER.map((a, i) => {
        const up = a.up;
        const x = sx(Math.min(a.when, 2050));
        const q = progAt(frame, 1 + i * 0.45, 0.8, EBACK);
        const h = a.h;
        return (
          <div key={a.who} style={{ position: "absolute", inset: 0, opacity: Math.min(1, q * 1.5) }}>
            <div style={{ position: "absolute", left: x - 7, top: y - 4, width: 14, height: 14, borderRadius: "50%", background: a.seller ? K.money : K.theme }} />
            <div style={{ position: "absolute", left: x, top: up ? y - h : y + 10, height: h - 6, borderLeft: `2px solid ${a.seller ? K.money : K.theme}88` }} />
            <div
              style={{
                position: "absolute",
                left: x,
                top: up ? y - h - 74 : y + h + 4,
                transform: `translateX(-50%) translateY(${(1 - q) * (up ? 20 : -20)}px)`,
                padding: "8px 14px",
                borderRadius: 12,
                background: "rgba(13,17,22,0.92)",
                border: `1.5px solid ${a.seller ? K.money : K.theme}77`,
                fontFamily: FONT,
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 900, color: K.fg }}>{a.who}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: a.seller ? K.money : K.theme }}>{a.label}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 170, top: 860, display: "flex", gap: 40, fontFamily: FONT }}>
        <In at={5} from="up">
          <div style={{ fontSize: 30, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>
            <span style={{ color: K.money, fontWeight: 900 }}>● 卖 AI 的人</span>说得最早。预测也会漂，两个方向都有：
          </div>
        </In>
      </div>
      <div style={{ position: "absolute", left: 170, top: 910, fontFamily: FONT }}>
        <In at={6} from="up">
          <div style={{ fontSize: 26, fontWeight: 600, color: K.muted, whiteSpace: "nowrap" }}>
            "AI 2027"的作者把自己的时间往后推了；研究者问卷却从 2060 年提前到了 2042 年。
          </div>
        </In>
      </div>
      <Src>Altman（TIME 2026-08）· Amodei（2026-01；Anthropic CEO，本片作者是 Anthropic 的模型）· AI Futures 2026-08 · Hassabis（Axios 2026-05）· Metaculus · Karpathy 2025-10 · AI Impacts 2026-09 · Narayanan & Kapoor 2025</Src>
    </AbsoluteFill>
  );
};

// ───────── 05-3 The film's own bold forecast, stamped as a forecast ─────────

const BOLD = [
  { k: "money", c: K.money, t: "AI 投资，每年超过 1 万亿美元" },
  { k: "power", c: K.power, t: "内存和电继续紧：数据中心用电翻一倍多" },
  { k: "skill", c: K.fg, t: "AI 能独立干完一个月的活（METR 外推）" },
  { k: "work", c: K.work, t: "第一份工作的缺口，走向 30% 以上" },
];

export const Bold: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={76} parts={["本片的大胆预测：", { t: "到 2030 年——", c: K.theme }]} />
      </div>
      <In at={0.6} from="flip" style={{ position: "absolute", left: 120, top: 280 }}>
        <Glass glow={K.theme} style={{ width: 1300, height: 560, padding: "34px 46px", boxSizing: "border-box" }}>
          {BOLD.map((b, i) => {
            const c = b.c;
            return (
              <In key={b.k} at={1.2 + i * 0.9} from="left">
                <div style={{ display: "flex", alignItems: "center", gap: 24, height: 118, borderTop: i ? `1px solid ${K.grid}` : undefined }}>
                  <span style={{ width: 16, height: 64, borderRadius: 8, background: c }} />
                  <span style={{ fontSize: 50, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>{b.t}</span>
                </div>
              </In>
            );
          })}
        </Glass>
      </In>
      <div style={{ position: "absolute", left: 1480, top: 360 }}>
        <Stamp at={5} color={K.theme} size={60} rotate={-10}>
          预测
        </Stamp>
      </div>
      <div style={{ position: "absolute", left: 1470, top: 520, width: 380, fontFamily: FONT, fontSize: 21, lineHeight: 1.55, color: K.muted, fontWeight: 600, opacity: progAt(frame, 5.4, 0.8) }}>
        趋势外推，不是定论。最后一行：把年轻人的缺口一年扩大 4 个百分点照直往后画。
      </div>
      <Src>本片推算 · 依据：BofA/Evercore、IEA、METR、Brynjolfsson 等（2026-08）</Src>
    </AbsoluteFill>
  );
};
