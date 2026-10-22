import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { CL, EIO, EO, In, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K } from "../theme";
import { Box, Cap, Head, Src } from "../ui";

// The Harvard Study of Adult Development: 268 Harvard men (Grant) and 456 Boston inner-city men (Glueck) = 724,
// followed since 1938. One dot each, scattered in a soft oval; the reveal joins near neighbours into a web.
const CX = 1430;
const CY = 560;
const RX = 350;
const RY = 330;
const DOTS = Array.from({ length: 724 }, (_, i) => {
  const a = random(`a${i}`) * Math.PI * 2;
  const r = Math.sqrt(random(`r${i}`));
  return { x: CX + Math.cos(a) * r * RX, y: CY + Math.sin(a) * r * RY, grant: i < 268, d: Math.hypot(Math.cos(a) * r, Math.sin(a) * r) };
});
const LINKS = (() => {
  const out: [number, number, number][] = [];
  for (let i = 0; i < DOTS.length; i++) {
    let n = 0;
    for (let j = i + 1; j < DOTS.length && n < 2; j++) {
      const d = Math.hypot(DOTS[i].x - DOTS[j].x, DOTS[i].y - DOTS[j].y);
      if (d < 34) {
        out.push([i, j, (DOTS[i].d + DOTS[j].d) / 2]);
        n++;
      }
    }
  }
  return out;
})();

// `web` 0–1 spreads the links out from the centre.
export const People: React.FC<{ appear: number; web: number; o?: number }> = ({ appear, web, o = 1 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: o }}>
    {LINKS.map(([i, j, d], k) => {
      const t = interpolate(web * 1.3 - d, [0, 0.3], [0, 1], CL);
      if (t <= 0) return null;
      const a = DOTS[i];
      const b = DOTS[j];
      return <line key={k} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * t} y2={a.y + (b.y - a.y) * t} stroke={K.gold} strokeOpacity={0.55} strokeWidth={1.4} />;
    })}
    {DOTS.map((p, i) => {
      const s = interpolate(appear * 1.25 - (i / DOTS.length) * 0.25 - p.d, [-0.2, 0], [0, 1], CL);
      if (s <= 0) return null;
      const lit = interpolate(web * 1.3 - p.d, [0, 0.3], [0, 1], CL);
      return <circle key={i} cx={p.x} cy={p.y} r={3.2 * s + 1.2 * lit} fill={lit > 0.05 ? K.gold : p.grant ? K.themeHi : K.fg} fillOpacity={0.55 + 0.45 * lit} />;
    })}
  </svg>
);

// 70 s: the one discovery, on the music's biggest re-entry.
export const Harvard: React.FC = () => {
  const frame = useBeatFrame();
  const appear = progAt(frame, 0.3, 3.5, EIO);
  const web = progAt(frame, 8, 4, EIO);
  return (
    <AbsoluteFill>
      <People appear={appear} web={web} />
      <Box x={130} y={250} style={{ gap: 16 }}>
        <Head at={0} parts={["哈佛从 1938 年起，"]} size={68} />
        <Head at={1.5} parts={["跟踪了 ", { t: "724 个人", c: K.theme }, "的一生。"]} size={68} />
        <div style={{ height: 24 }} />
        <Cap at={4.5} size={44} color={K.sub}>跟到老，最能预示他们健康、快乐的——</Cap>
        <Head at={8} parts={[{ t: "是关系，", c: K.gold }, "不是成就。"]} size={100} />
        <Cap at={11} size={32} color={K.sub}>50 岁时对关系最满意的人，80 岁时最健康。</Cap>
      </Box>
      <Src>哈佛成人发展研究 · Grant 268 人 + Glueck 456 人 · 只有男性，观察性研究，相关不等于因果</Src>
    </AbsoluteFill>
  );
};

// 80 s: the meta-analysis behind it.
export const Survive: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <People appear={1} web={1} o={0.12} />
      <Box x={960} y={330} cx style={{ gap: 10 }}>
        <Head at={0} parts={["关系更紧密的人，"]} size={76} />
        <In at={1.5} from="up" dist={30}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <span style={{ fontFamily: FONT, fontSize: 76, fontWeight: 900, color: K.fg }}>存活几率高</span>
            <Odometer value={50 * progAt(frame, 1.5, 1.4, EO)} size={200} suffix="%" color={K.theme} />
          </div>
        </In>
      </Box>
      <Src>Holt-Lunstad 等 2010 · 148 项研究、30.9 万人 · 观察性研究合并，相关不是因果</Src>
    </AbsoluteFill>
  );
};
