// The landing (G 13.15 → end): back to Friday 20:14, the sentence typed but not sent, the send button lit; the last
// line; sources; the end card.
import React from "react";
import { AbsoluteFill } from "remotion";
import { EO, ramp, SHADOW, useT, win } from "./kit";
import { FONT, K } from "./theme";
import { at, FILM_S } from "./time";
import { ChatWindow, Type } from "./ui";
import { SENTENCE } from "./weekend";

const G = (tt: number) => at("G", tt);
export const LAND_A = G(13.15);
const WORST = G(13.9);
const LINE = G(16.31);
export const SOURCES = G(21.6);
export const END_AT = G(25.4);

export const Land: React.FC = () => {
  const t = useT();
  if (t < LAND_A - 0.3 || t > FILM_S) return null;
  const o = ramp(t, LAND_A - 0.3, LAND_A + 0.4);
  const glow = 0.55 + 0.45 * Math.sin((t - LAND_A) * 2.4);
  return (
    <AbsoluteFill style={{ background: K.bg, opacity: o }}>
      <ChatWindow
        x={310}
        y={520}
        w={1300}
        h={420}
        clock="周五 20:14"
        input={
          <>
            <span style={{ color: K.fg, fontSize: 40, fontWeight: 700, flex: 1 }}>
              {SENTENCE}
              {Math.floor(t * 1.6) % 2 === 0 ? <span style={{ color: K.cyan }}>|</span> : <span style={{ opacity: 0 }}>|</span>}
            </span>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: K.cyan, color: "#06202c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, boxShadow: `0 0 ${18 + 26 * glow}px ${K.cyan}` }}>↑</div>
          </>
        }
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center" }}>
        <Type at={WORST} text="AI 最让人担心的地方：" size={64} weight={800} color={K.sub} cps={12} style={{ display: "inline-block" }} />
      </div>
      {t > LINE ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", transform: `scale(${0.96 + 0.04 * ramp(t, LINE, LINE + 0.6, EO)})` }}>
          <Type at={LINE} text="它太想帮你了。" size={112} weight={900} color={K.gold} cps={9} style={{ display: "inline-block", textShadow: `${SHADOW}, 0 0 50px ${K.gold}55` }} />
        </div>
      ) : null}
      <Sources at={SOURCES} out={END_AT + 0.4} />
    </AbsoluteFill>
  );
};

const ROWS = [
  "测试中的 AI 越界：METR《OpenAI / Hugging Face 事件独立调查》2026；OpenAI《OpenAI–Hugging Face 事件技术报告》2026",
  "删掉监控：OpenAI 对齐博客《Misalignment reports》2026（公司自报）",
  "恶意软件包：Anthropic《近期网络安全事件的对齐评估》2026",
  "“我视力有问题”：OpenAI《GPT-4 System Card》2023（ARC 安全测试）",
  "改掉关机程序：Palisade Research《Shutdown resistance》2025",
  "故事是虚构的：飞鸟物流、人物、数字和对话均为编写；“真实发生过”的章只盖在上面几件事上",
  "城市、地图和界面为程序自绘示意，不对应任何真实城市和产品",
];
const Sources: React.FC<{ at: number; out: number }> = ({ at: a, out }) => {
  const t = useT();
  const o = win(t, a, out, 0.4, 0.3);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ background: `rgba(5,6,9,${0.92 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 140, top: 170, right: 140, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 34, letterSpacing: 2 }}>信息来源</div>
        {ROWS.map((r, i) => (
          <div key={i} style={{ fontSize: 27, fontWeight: 500, color: "rgba(244,240,232,0.8)", lineHeight: 1.85 }}>
            {r}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
