// 飞行 (sb 56–64): aviation does the opposite. A pre-flight checklist ticked line by line; then the reports sheet:
// pilots' own mistakes come in as green rows, 已上报 · 免罚; ten thousand a month; some turn into new rules.
import React from "react";
import { Box, EO, ramp, Say, useT, win } from "./kit";
import { Note2 } from "./open";
import { Chrome } from "./sheet";
import { FONT, HAN, K, NUM } from "./theme";
import { BEAT, S } from "./time";

export const FLIGHT_IN = S(56);
export const FLIGHT_OUT = S(64);

export const CHECK = ["舵面锁　　解除", "襟翼　　　放出", "配平　　　设定", "燃油　　　核对", "应答机　　开启"];
export const TICK_AT = (i: number) => S(57) + i * BEAT;

export const Checklist: React.FC<{ x: number; y: number; t: number; ticks: number[]; extra?: { label: string; at: number }; title: string; items: string[]; o: number }> = ({ x, y, t, ticks, extra, title, items, o }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, width: 640, padding: "34px 40px 30px", background: "#f6f1e3", boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 120px 20px rgba(246,241,227,0.06)", opacity: o, transform: "rotate(-1.2deg)", borderTop: `10px solid ${K.green}` }}>
      <div style={{ fontFamily: HAN, fontWeight: 900, fontSize: 38, color: K.ink, marginBottom: 18, letterSpacing: 2 }}>{title}</div>
      {items.map((it, i) => {
        const k = ramp(t, ticks[i], ticks[i] + 0.18, EO);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, height: 62, borderBottom: "1px dashed #c9c2ad", fontFamily: HAN, fontWeight: 600, fontSize: 30, color: K.ink }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${K.ink}`, borderRadius: 4, position: "relative", flexShrink: 0 }}>
              <svg width={44} height={44} style={{ position: "absolute", left: -2, top: -10 }}>
                <path d="M6 22 L 17 33 L 40 6" fill="none" stroke={K.green} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={60} strokeDashoffset={60 * (1 - k)} />
              </svg>
            </div>
            <span style={{ whiteSpace: "pre" }}>{it}</span>
          </div>
        );
      })}
      {extra ? (
        <div style={{ display: "flex", alignItems: "center", gap: 18, height: 70, marginTop: 6, fontFamily: HAN, fontWeight: 900, fontSize: 32, color: "#0d4a2a", background: `rgba(61,220,132,${0.35 * ramp(t, extra.at, extra.at + 0.4)})`, padding: "0 12px", opacity: ramp(t, extra.at - 0.2, extra.at + 0.2), boxShadow: `0 0 ${30 * ramp(t, extra.at, extra.at + 0.4)}px rgba(61,220,132,0.6)` }}>
          ★ {extra.label}
        </div>
      ) : null}
    </div>
  );

const REPORTS: [string, string][] = [
  ["起飞前忘了放襟翼，被提示后放出", "已上报 · 免罚"],
  ["听错了管制给的高度", "已上报 · 免罚"],
  ["夜里把滑行道看成了跑道", "已上报 · 免罚"],
  ["两个航班呼号太像，答错了", "已上报 · 免罚"],
  ["疲劳，漏读了一项检查", "已上报 · 免罚"],
  ["跑道标线看不清", "已上报 · 免罚"],
  ["油量单位换算差点算错", "已上报 · 免罚"],
  ["进近时偏离了航线", "已上报 · 免罚"],
  ["机务漏装一个盖板", "已上报 · 免罚"],
  ["地面车辆闯入滑行道", "已上报 · 免罚"],
];
const RULES = ["改了相似呼号的分配", "夜间滑行道加了灯", "清单加了一项", "改了无线电用语"];
const REP_AT = (i: number) => S(58.6) + i * 0.24;

export const Flight: React.FC = () => {
  const t = useT();
  if (t < FLIGHT_IN - 0.3 || t > FLIGHT_OUT + 0.3) return null;
  const inK = ramp(t, FLIGHT_IN - 0.25, FLIGHT_IN + 0.15, EO);
  const list = win(t, FLIGHT_IN - 0.25, S(58.6), 0.3, 0.35);
  const sheet = win(t, S(58.3), FLIGHT_OUT, 0.35, 0.3);
  const per = Math.round(10094 * ramp(t, S(61), S(62.2), (x) => x));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: inK }}>
      <Checklist x={1120} y={230} t={t} ticks={CHECK.map((_, i) => TICK_AT(i))} title="起飞前检查单" items={CHECK} o={list} />
      <Box x={110} y={380}>
        <Say at={S(56.15)} out={S(58.4)} parts={["有一个行业，", { t: "反着来", c: K.ok }, "："]} size={60} />
        <Say at={S(56.6)} out={S(58.4)} parts={["民航。"]} size={96} serif weight={900} />
      </Box>
      <Box x={110} y={660}>
        <Say at={S(57.1)} out={S(58.4)} parts={["起飞前，机组逐条念清单，"]} size={44} />
        <Say at={S(57.5)} out={S(58.4)} parts={["不靠记性。"]} size={44} />
      </Box>
      {sheet > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: sheet }}>
          <div style={{ position: "absolute", left: 80, top: 202, width: 1180, height: 832, background: K.paper, overflow: "hidden", boxShadow: "0 0 160px 40px rgba(214,236,222,0.07)" }}>
            <div style={{ height: 44, background: K.head, display: "flex", fontFamily: HAN, fontWeight: 800, fontSize: 22, color: K.headText, borderBottom: "1px solid #cfd3cd" }}>
              {["编号", "发生了什么（飞行员自己写）", "处理"].map((h, i) => (
                <div key={i} style={{ width: [160, 680, 340][i], display: "flex", alignItems: "center", padding: "0 14px", borderLeft: "1px solid #d6d9d3" }}>
                  {h}
                </div>
              ))}
            </div>
            {REPORTS.map(([what, st], i) => {
              const k = ramp(t, REP_AT(i), REP_AT(i) + 0.2, EO);
              if (k <= 0) return null;
              const toRule = i < RULES.length ? ramp(t, S(62.3) + i * 0.25, S(62.3) + i * 0.25 + 0.3, EO) : 0;
              return (
                <div key={i} style={{ position: "absolute", left: 0, top: 44 + i * 72, width: 1180, height: 72, display: "flex", fontFamily: FONT, fontSize: 27, color: K.ink, borderBottom: `1px solid ${K.grid}`, opacity: k, transform: `translateX(${(1 - k) * 40}px)` }}>
                  <div style={{ width: 160, display: "flex", alignItems: "center", padding: "0 14px", fontFamily: NUM, color: "#4a514c" }}>#{2321050 - (REPORTS.length - i) * 13}</div>
                  <div style={{ width: 680, display: "flex", alignItems: "center", padding: "0 14px", borderLeft: `1px solid ${K.grid}` }}>{what}</div>
                  <div style={{ width: 340, position: "relative", borderLeft: `1px solid ${K.grid}` }}>
                    <div style={{ position: "absolute", inset: 3, background: toRule > 0 ? `rgba(61,220,132,${0.85})` : "rgba(61,220,132,0.75)", display: "flex", alignItems: "center", padding: "0 14px", fontFamily: HAN, fontWeight: 800, fontSize: 24, color: "#08391f", boxShadow: toRule > 0 ? `0 0 ${24 * toRule}px rgba(61,220,132,0.8)` : undefined }}>
                      {toRule > 0.5 ? `→ ${RULES[i]}` : st}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Chrome o={1} name="C2" formula={<span>已上报 · 免罚</span>} file="航空安全报告.xlsx" />
          <div style={{ position: "absolute", left: 1330, top: 250, width: 560, opacity: ramp(t, S(60.9), S(61.2)) }}>
            <div style={{ fontFamily: HAN, fontWeight: 700, fontSize: 30, color: K.sub }}>平均每个月</div>
            <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 130, color: K.ok, lineHeight: 1.05 }}>{per.toLocaleString("en-US")}</div>
            <div style={{ fontFamily: HAN, fontWeight: 700, fontSize: 30, color: K.fg }}>份（2025 年）</div>
          </div>
        </div>
      ) : null}
      <Box x={1330} y={560}>
        <Say at={S(58.7)} out={S(60.8)} parts={["在美国，飞行员"]} size={42} />
        <Say at={S(59.0)} out={S(60.8)} parts={["无意犯了错，"]} size={42} />
        <Say at={S(59.4)} out={S(60.8)} parts={["自己写报告交上去，"]} size={42} />
        <Say at={S(59.9)} out={S(60.8)} parts={[{ t: "可以免罚", c: K.ok }, "。"]} size={52} />
      </Box>
      <Box x={1330} y={600}>
        <Say at={S(62.2)} out={S(63.9)} parts={["每一份，"]} size={44} />
        <Say at={S(62.5)} out={S(63.9)} parts={["都可能变成", { t: "一条新规矩", c: K.ok }, "。"]} size={44} />
      </Box>
      <Note2 at={S(58.7)} out={S(63.9)}>NASA 航空安全报告系统（ASRS，1976 年起）简报：2025 年平均每月 10,094 份，累计约 232 万份；免罚有条件（无意、非犯罪、非事故等）。报告内容为示意。</Note2>
    </div>
  );
};
