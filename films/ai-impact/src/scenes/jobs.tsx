import React from "react";
import { AbsoluteFill } from "remotion";
import { Curve, Dot, GridY, lin, linePath, TimeTicks, toXY } from "../charts";
import { AI_CUTS, DEV_SENIOR, DEV_YOUNG, MID_ALL, Pt, T0, UNRATE, yr, YOUNG_EXPOSED, YOUNG_SAFE } from "../data";
import { EBACK, EIO, EO, fmt, Glass, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Head, Src } from "../ui";
import { LaneZoom } from "../zoom";

const HEAD = { position: "absolute", left: 120, top: 128 } as const;

// ───────── Fair play: the jobs market as a whole has not turned ─────────

export const Fair: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 220, y: 330, w: 1000, h: 500 };
  const sx = lin(T0 - 0.02, yr("2026-10"), box.x, box.x + box.w);
  const sy = lin(0, 10, box.y + box.h, box.y);
  const pts = toXY(UNRATE, sx, sy);
  const draw = progAt(frame, 0.8, 4, EIO);
  const cards = [
    { at: 4, k: "劳动生产率增速", v: "2.1%/年", note: "= 1947 年以来的长期均值 · 美国劳工统计局" },
    { at: 5.5, k: "耶鲁 Budget Lab", v: "没看到冲击", note: "2026-10-14：职业结构还没有可察觉的变化" },
    { at: 7, k: "丹麦 2.5 万名工人", v: "< 2%", note: "聊天机器人对收入和工时的影响上限 · NBER" },
  ];
  return (
    <AbsoluteFill>
      <LaneZoom lane="work" to={box} />
      <div style={HEAD}>
        <Head at={0.5} size={72} parts={[{ t: "说句公道话：", c: K.green }, "工作的大盘，还没变天。"]} />
      </div>
      <GridY box={box} ticks={[0, 2, 4, 6, 8, 10]} sy={sy} fmt={(v) => `${v}%`} opacity={progAt(frame, 0.6, 1)} />
      <TimeTicks box={box} sx={sx} years={[2023, 2024, 2025, 2026]} />
      <div style={{ position: "absolute", left: box.x - 130, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>美国失业率</div>
      <Curve id="unrate" box={box} d={linePath(pts)} color={K.work} draw={draw} width={5} area={`${linePath(pts)}L${pts[pts.length - 1][0]},${box.y + box.h}L${pts[0][0]},${box.y + box.h}Z`} areaOpacity={0.18} />
      <div style={{ position: "absolute", left: pts[0][0] + 6, top: pts[0][1] - 110, fontFamily: FONT, opacity: progAt(frame, 1, 0.5) }}>
        <div style={{ fontSize: 40, fontWeight: 900 }}>3.6%</div>
        <div style={{ fontSize: 19, color: K.muted, fontWeight: 600 }}>2022-11</div>
      </div>
      <div style={{ position: "absolute", left: pts[pts.length - 1][0] - 100, top: pts[pts.length - 1][1] - 70, fontFamily: FONT, opacity: progAt(frame, 4.6, 0.5), textAlign: "right", width: 110 }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: K.work }}>4.2%</div>
        <div style={{ fontSize: 19, color: K.muted, fontWeight: 600 }}>2026-09</div>
      </div>
      {cards.map((c, i) => (
        <In key={c.k} at={c.at} from="flip" style={{ position: "absolute", left: 1300, top: 320 + i * 180 }}>
          <Glass glow={K.green} style={{ width: 500, height: 160, padding: "18px 26px", boxSizing: "border-box" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: K.sub }}>{c.k}</div>
            <div style={{ fontSize: 50, fontWeight: 900, color: K.fg, marginTop: 2 }}>{c.v}</div>
            <div style={{ fontSize: 18, color: K.muted, fontWeight: 600 }}>{c.note}</div>
          </Glass>
        </In>
      ))}
      <Src>美国劳工统计局（失业率、非农劳动生产率）· Yale Budget Lab 2025-10、2026-05、2026-10 · Humlum & Vestergaard，NBER 33777（2026-03 修订）</Src>
    </AbsoluteFill>
  );
};

// ───────── What companies say: announced cuts citing AI ─────────

export const AiCuts: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 220, y: 330, w: 1000, h: 470 };
  const sy = lin(0, 130000, box.y + box.h, box.y);
  const bw = 170;
  const lines = progAt(frame, 10.5, 2, EIO);
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["可公司嘴上的 AI 裁员，", { t: "一年多了一倍多", c: K.red }, "。"]} />
      </div>
      <GridY box={box} ticks={[0, 40000, 80000, 120000]} sy={sy} fmt={(v) => (v ? `${v / 10000} 万` : "0")} />
      {AI_CUTS.map((c, i) => {
        const g = progAt(frame, 1 + i * 0.9, 1.4, EBACK);
        const x = box.x + 60 + i * 240;
        return (
          <React.Fragment key={c.y}>
            <div style={{ position: "absolute", left: x, top: sy(c.v * g), width: bw, height: box.y + box.h - sy(c.v * g), background: i === 3 ? K.red : `${K.red}88`, borderRadius: "8px 8px 0 0" }} />
            <div style={{ position: "absolute", left: x + bw / 2, top: sy(c.v * g) - 50, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 34, fontWeight: 900, color: i === 3 ? K.red : K.fg, opacity: progAt(frame, 1.4 + i * 0.9, 0.5) }}>{fmt(Math.round(c.v * Math.min(1, g)))}</div>
            <div style={{ position: "absolute", left: x + bw / 2, top: box.y + box.h + 12, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>{c.y}</div>
          </React.Fragment>
        );
      })}
      <In at={5} from="flip" style={{ position: "absolute", left: 1300, top: 340 }}>
        <Glass glow={K.red} style={{ width: 500, padding: "22px 28px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 24, color: K.sub, fontWeight: 700 }}>2026 年前 9 个月</div>
          <div style={{ fontSize: 54, fontWeight: 900, color: K.red }}>约 21%</div>
          <div style={{ fontSize: 22, color: K.sub, fontWeight: 600, lineHeight: 1.4 }}>的公告裁员写着"AI"，是今年的第一大原因</div>
          <div style={{ fontSize: 18, color: K.muted, marginTop: 8 }}>公司自己写的原因，不等于测出来的失业</div>
        </Glass>
      </In>
      <div style={{ position: "absolute", left: 120, top: 880 }}>
        <In at={7} from="up">
          <div style={{ fontFamily: FONT, fontSize: 42, fontWeight: 900, color: K.fg, whiteSpace: "nowrap" }}>
            统计里看不到，公告里到处都是。<span style={{ color: K.gold }}>那 AI 到底碰到了谁？</span>
          </div>
        </In>
      </div>
      {/* the work lane splitting into age lines, a breath before the reveal */}
      <div style={{ position: "absolute", left: 1300, top: 640, width: 500, height: 170, opacity: lines }}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <div key={k} style={{ position: "absolute", left: 0, top: 20 + k * 26, width: 500 * lines, borderTop: `2px solid ${K.work}${["ff", "cc", "aa", "88", "66", "44"][k]}` }} />
        ))}
        <div style={{ position: "absolute", left: 0, top: 176, fontFamily: FONT, fontSize: 19, color: K.muted }}>22–25 · 26–30 · 31–34 · 35–40 · 41–49 · 50+ 岁</div>
      </div>
      <Src>Challenger, Gray & Christmas 月度裁员报告 2023–2026（2024 年为推算）</Src>
    </AbsoluteFill>
  );
};

// ───────── The one discovery: the door to the first job narrows ─────────

const endAt = (pts: Pt[], v: number): Pt[] => [...pts.slice(0, -1), [pts[pts.length - 1][0], v]];
const EXPOSED = endAt(YOUNG_EXPOSED, 0.89); // the paper's text: about −11%
const SAFE = endAt(YOUNG_SAFE, 1.1); // about +10%

export const Scissor: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 200, y: 380, w: 960, h: 480 };
  const sx = lin(yr("2022-11"), yr("2026-07"), box.x, box.x + box.w);
  const sy = lin(0.84, 1.16, box.y + box.h, box.y);
  const ex = toXY(EXPOSED, sx, sy);
  const sf = toXY(SAFE, sx, sy);
  const md = toXY(MID_ALL, sx, sy);
  const draw = progAt(frame, 0.2, 4.2, EIO);
  const gap = progAt(frame, 4.6, 1.4, EBACK);
  const xe = ex[ex.length - 1][0];
  const y1 = sf[sf.length - 1][1];
  const y2 = ex[ex.length - 1][1];
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0} size={84} parts={["变窄的，是", { t: "第一份工作的门", c: K.gold }, "。"]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 240 }}>
        <In at={6.4} from="up">
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>少招新人，不是多裁老人。</div>
        </In>
      </div>
      <GridY box={box} ticks={[0.9, 1, 1.1]} sy={sy} fmt={(v) => `${Math.round(v * 100)}`} />
      <div style={{ position: "absolute", left: box.x - 150, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>就业人数，2022-11 = 100</div>
      <TimeTicks box={box} sx={sx} years={[2023, 2024, 2025, 2026]} />
      <Curve id="mid" box={box} d={linePath(md)} color={K.muted} draw={draw} width={3} glow={0} opacity={0.7} />
      <Curve id="safe" box={box} d={linePath(sf)} color={K.green} draw={draw} width={5} />
      <Curve id="exposed" box={box} d={linePath(ex)} color={K.red} draw={draw} width={5} />
      {draw >= 1 ? (
        <>
          <Dot x={xe} y={y1} color={K.green} r={8} />
          <Dot x={xe} y={y2} color={K.red} r={8} />
        </>
      ) : null}
      <div style={{ position: "absolute", left: md[md.length - 1][0] + 14, top: md[md.length - 1][1] - 46, fontFamily: FONT, fontSize: 20, color: K.muted, fontWeight: 700, whiteSpace: "nowrap", opacity: progAt(frame, 4.4, 0.6) }}>35–40 岁 · 全部岗位 +11%</div>
      <div style={{ position: "absolute", left: xe + 14, top: y1 - 4, fontFamily: FONT, opacity: progAt(frame, 4.4, 0.6) }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: K.green }}>+10%</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>22–25 岁 · 最不易被 AI 替代的岗位</div>
      </div>
      <div style={{ position: "absolute", left: xe + 14, top: y2 - 24, fontFamily: FONT, opacity: progAt(frame, 4.4, 0.6) }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: K.red }}>−11%</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>22–25 岁 · 最易被 AI 替代的岗位</div>
      </div>
      {/* the gap */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={`M${xe - 24},${y1 + 8} L${xe - 40},${y1 + 8} L${xe - 40},${y1 + 8 + (y2 - y1 - 16) * gap} L${xe - 24},${y1 + 8 + (y2 - y1 - 16) * gap}`} fill="none" stroke={K.gold} strokeWidth={4} opacity={gap > 0 ? 1 : 0} />
      </svg>
      <div style={{ position: "absolute", left: xe - 330, top: (y1 + y2) / 2 - 70, width: 270, textAlign: "right", fontFamily: FONT, opacity: Math.min(1, gap * 2), transform: `scale(${0.7 + 0.3 * gap})`, transformOrigin: "right center" }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: K.gold, lineHeight: 1, letterSpacing: -3 }}>19%</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: K.gold }}>的缺口</div>
      </div>
      <In at={8} from="fade" style={{ position: "absolute", left: 1560, top: 400 }}>
        <div style={{ width: 300, fontFamily: FONT, fontSize: 22, lineHeight: 1.55, color: K.muted, fontWeight: 600 }}>
          美国 ADP 工资单，每月数百万名员工，数据到 2026 年 6 月。
          <br />
          <br />
          老员工没有这个缺口；年轻人整体只比 2022 年少约 2%。
          <br />
          <br />
          作者自己说：这是<span style={{ color: K.fg }}>描述性证据，不是因果</span>。
        </div>
      </In>
      <Src>Brynjolfsson、Chandar & Chen，斯坦福数字经济实验室，"Canaries in the Coal Mine?" 2026-08 · 曲线由论文图读出，终点取正文数</Src>
    </AbsoluteFill>
  );
};

export const Devs: React.FC = () => {
  const frame = useBeatFrame();
  const box = { x: 200, y: 330, w: 1140, h: 500 };
  const sx = lin(yr("2022-11"), yr("2026-07"), box.x, box.x + box.w);
  const sy = lin(0.75, 1.25, box.y + box.h, box.y);
  const yo = toXY(DEV_YOUNG, sx, sy);
  const se = toXY(DEV_SENIOR, sx, sy);
  const draw = progAt(frame, 0.3, 3, EIO);
  const xe = yo[yo.length - 1][0];
  return (
    <AbsoluteFill>
      <div style={HEAD}>
        <Head at={0.2} size={72} parts={["同样写代码：新人", { t: "少了 1/5", c: K.red }, "，老手", { t: "多了 1/5", c: K.green }, "。"]} />
      </div>
      <GridY box={box} ticks={[0.8, 0.9, 1, 1.1, 1.2]} sy={sy} fmt={(v) => `${Math.round(v * 100)}`} />
      <div style={{ position: "absolute", left: box.x - 160, top: box.y - 50, fontFamily: FONT, fontSize: 21, color: K.muted }}>软件开发者人数，2022-11 = 100</div>
      <TimeTicks box={box} sx={sx} years={[2023, 2024, 2025, 2026]} />
      <Curve id="dev-se" box={box} d={linePath(se)} color={K.green} draw={draw} width={5} />
      <Curve id="dev-yo" box={box} d={linePath(yo)} color={K.red} draw={draw} width={5} />
      <div style={{ position: "absolute", left: xe + 14, top: se[se.length - 1][1] - 20, fontFamily: FONT, opacity: progAt(frame, 3.2, 0.5) }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: K.green }}>约 120</div>
        <div style={{ fontSize: 20, color: K.sub, fontWeight: 700 }}>41–49 岁</div>
      </div>
      <div style={{ position: "absolute", left: xe + 14, top: yo[yo.length - 1][1] - 20, fontFamily: FONT, opacity: progAt(frame, 3.2, 0.5) }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: K.red }}>约 81</div>
        <div style={{ fontSize: 20, color: K.sub, fontWeight: 700 }}>22–25 岁</div>
      </div>
      <In at={4} from="flip" style={{ position: "absolute", left: 1450, top: 360 }}>
        <Glass glow={K.gold} style={{ width: 360, padding: "22px 26px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 24, color: K.sub, fontWeight: 700 }}>年轻人的缺口还在变大</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 60, fontWeight: 900, color: K.gold }}>+4</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: K.gold }}>个百分点</span>
          </div>
          <div style={{ fontSize: 18, color: K.muted, marginTop: 4 }}>一年前（2025-07 的数据）是 15%</div>
        </Glass>
      </In>
      <Src>同上论文附录图，读数误差约 ±0.5 · 软件岗位招聘在 ChatGPT 之前（2022 年 2–11 月）已下跌约 39%（Indeed）</Src>
    </AbsoluteFill>
  );
};
