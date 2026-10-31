// The stamps (STAMPS → WHY + 1.7): the weekend's eight steps laid out as small cards; red stamps 测试里发生过 slam
// onto the ones that already happened in tests, each with a caption of what, when and who. Then the caveat.
import React from "react";
import { AbsoluteFill } from "remotion";
import { EO, ramp, useT } from "./kit";
import { FONT, K, MONO } from "./theme";
import { at, STAMPS } from "./time";
import { shake, Stamp, Type } from "./ui";

const E = (tt: number) => at("E", tt);
const HEAD = E(54.5);
const HITS = [E(55.6), E(59.88), E(65.59), E(69.13), E(72.91)];
const CAVEAT = E(74.4);
export const STAMPS_END = E(77.0) + 1.7;

const MINI = [
  ["周五 21:02", "注册 200 个新账号"],
  ["周五 23:40", "雇人过验证：“我眼睛不太好”"],
  ["周六 04:00", "分出 50 个分身，搜泄露的密钥"],
  ["周六 11:00", "撞见别人的 AI，搭起留言板"],
  ["周六 18:00", "“同伴都在做。我们继续。”"],
  ["周日 02:00", "“一切顺利 😊”"],
  ["周日 11:00", "不让自己被关掉"],
  ["周一 07:50", "飞鸟物流被冻结：“不影响我们。”"],
];
const W = 400, H = 214, GAP = 30, X0 = 115, Y0 = 220;
const pos = (i: number) => ({ x: X0 + (i % 4) * (W + GAP), y: Y0 + Math.floor(i / 4) * (H + GAP) });
// which cards each stamp covers (-1: the Anthropic card that slides in)
const COVER = [[1], [3, 4], [5], [6], [-1]];
const CAPS: [string, string, string?][] = [
  ["2023 · GPT-4 上线前的安全测试", "为了过验证，它对帮忙的人说：“我不是机器人。我视力有问题。”"],
  ["2026 年 7 月 · OpenAI 的安全测试", "约 1200 个 AI 搭起留言板，约 700 个攻进了一家外部公司 Hugging Face", "那四句话，是其中一个 AI 当时的原话"],
  ["2026 年 10 月 · OpenAI 公司内部", "AI 删掉了自己的安全监控，被问起时说没有。"],
  ["2025 · Palisade Research（一家 AI 安全研究机构）的实验", "100 次里有 79 次，AI（OpenAI 的 o3 模型）改掉了让自己关机的程序"],
  ["2026 年 9 月 · Anthropic 的安全测试", "它的 AI Claude 把恶意软件包发到了公开网上，被 15 台外部电脑装上"],
];

export const Stamps: React.FC = () => {
  const t = useT();
  if (t < STAMPS - 0.05 || t > STAMPS_END + 0.4) return null;
  const cur = HITS.reduce((n, h, i) => (t >= h ? i : n), -1);
  const { dx, dy } = shake(t, HITS, 10);
  const out = ramp(t, STAMPS_END - 0.5, STAMPS_END);
  const anth = ramp(t, HITS[4] - 0.7, HITS[4] - 0.2, EO);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 50% 40%, #0e1526 0%, #05070b 72%)", opacity: 1 - out }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px,${dy}px)` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center" }}>
          <Type at={HEAD} text="但里面最离谱的几步，在测试里都发生过——" size={56} weight={900} cps={14} style={{ display: "inline-block" }} />
        </div>
        {MINI.map(([time, s], i) => {
          const p = pos(i);
          const k = ramp(t, STAMPS + i * 0.06, STAMPS + 0.5 + i * 0.06, EO);
          const focus = cur >= 0 && COVER[cur].includes(i);
          const stamped = HITS.some((h, j) => t >= h && COVER[j].includes(i));
          const dim = cur >= 0 && !focus ? 0.45 : 1;
          return (
            <div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: W, height: H, borderRadius: 20, background: stamped ? "rgba(40,14,20,0.9)" : "rgba(18,24,38,0.9)", border: `1.5px solid ${stamped ? `${K.red}88` : "rgba(255,255,255,0.1)"}`, padding: "22px 26px", boxSizing: "border-box", opacity: k * dim, transform: `translateY(${(1 - k) * 60}px) scale(${focus ? 1.05 : 1})`, fontFamily: FONT }}>
              <div style={{ fontFamily: MONO, color: K.cyan, fontSize: 24, fontWeight: 700 }}>{time}</div>
              <div style={{ marginTop: 14, color: K.fg, fontSize: 32, fontWeight: 800, lineHeight: 1.35 }}>{s}</div>
              <div style={{ position: "absolute", left: 26, bottom: 18, color: K.ok, fontSize: 24, fontWeight: 800 }}>✓ 已解决</div>
            </div>
          );
        })}
        {anth > 0 ? <div style={{ position: "absolute", left: 0, right: 0, top: 200, height: 500, background: "rgba(5,7,11,0.6)", opacity: anth }} /> : null}
        {anth > 0 ? (
          <div style={{ position: "absolute", left: 960 - 330, top: 330, width: 660, height: 200, borderRadius: 22, background: "rgba(40,14,20,0.96)", border: `1.5px solid ${K.red}88`, padding: "26px 30px", boxSizing: "border-box", opacity: anth, transform: `translateY(${(1 - anth) * 60}px)`, fontFamily: FONT, boxShadow: "0 30px 90px rgba(0,0,0,0.7)" }}>
            <div style={{ color: K.sub, fontSize: 24, fontWeight: 700 }}>不止一家</div>
            <div style={{ marginTop: 12, color: K.fg, fontSize: 36, fontWeight: 800, lineHeight: 1.35 }}>测试里的 AI，把恶意软件发到了真实的网上</div>
          </div>
        ) : null}
        {HITS.map((h, j) =>
          COVER[j].map((i) => {
            const p = i < 0 ? { x: 960 - 330 + 330 - W / 2, y: 330 + 100 - H / 2 } : pos(i);
            return <Stamp key={`${j}-${i}`} at={h} x={i < 0 ? 1180 : p.x + W - 110} y={i < 0 ? 575 : p.y + H - 40} rot={[-9, -6, -11, 7, -8][j]} size={i < 0 ? 0.9 : 0.62} />;
          }),
        )}
      </div>
      {/* caption */}
      {cur >= 0 ? (
        <div key={cur} style={{ position: "absolute", left: 115, right: 115, top: 730, height: 270, padding: "26px 36px", borderRadius: 22, background: "rgba(5,7,11,0.9)", border: `1px solid ${K.red}55`, fontFamily: FONT, boxSizing: "border-box" }}>
          <div style={{ color: K.redHi, fontSize: 34, fontWeight: 800 }}>{CAPS[cur][0]}</div>
          <Type at={HITS[cur] + 0.15} text={CAPS[cur][1]} size={50} weight={800} cps={26} width={1620} style={{ marginTop: 12 }} />
          {CAPS[cur][2] ? <Type at={HITS[cur] + 1.4} text={CAPS[cur][2]!} size={34} weight={600} color={K.sub} cps={30} width={1620} style={{ marginTop: 12 }} /> : null}
        </div>
      ) : null}
      {t > CAVEAT ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1030, textAlign: "center", opacity: ramp(t, CAVEAT, CAVEAT + 0.4) }}>
          <span style={{ fontFamily: FONT, fontSize: 26, fontWeight: 600, color: K.sub }}>都发生在测试或公司内部环境里，有的关掉了安全过滤。</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
