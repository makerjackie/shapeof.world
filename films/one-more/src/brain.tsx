// A schematic side view of the brain, facing left (local box 800 × 600, centre 400, 300). Positions of the
// systems are illustrative, labelled 示意 on screen: the wanting system is a large network rising from the midbrain;
// liking is a few tiny hotspots (about 1 mm³ each in the rat, Peciña & Berridge 2005); "knowing" glows at the front.
import React from "react";
import { clamp01 } from "./kit";
import { K } from "./theme";

type P = [number, number];
type Cubic = [P, P, P, P];

const OUTER =
  "M 150 360 C 95 300, 92 205, 150 150 C 205 95, 300 60, 400 58 C 520 56, 620 95, 680 165 C 728 222, 738 292, 708 348 " +
  "C 688 384, 648 400, 606 396 C 590 430, 545 448, 500 440 C 455 452, 400 448, 358 432 C 300 440, 240 430, 205 405 C 180 395, 162 382, 150 360 Z";
const CEREBELLUM = "M 560 400 C 590 378, 680 380, 712 410 C 738 440, 715 486, 668 494 C 620 502, 572 482, 556 452 C 548 434, 548 412, 560 400 Z";
const STEM = "M 468 428 C 472 480, 476 530, 466 590 L 516 590 C 512 535, 518 482, 534 430 Z";
const FOLDS = [
  "M 430 62 C 420 120, 440 170, 415 230",
  "M 300 80 C 320 120, 290 150, 300 190",
  "M 560 80 C 540 130, 575 160, 560 205",
  "M 640 140 C 610 170, 640 215, 610 250",
  "M 200 140 C 230 170, 210 205, 235 240",
  "M 240 380 C 300 350, 380 345, 450 360",
  "M 170 260 C 200 280, 205 310, 190 340",
  "M 520 300 C 560 290, 600 300, 640 330",
  "M 360 120 C 380 150, 360 180, 372 205",
  "M 575 425 C 610 410, 670 412, 700 432",
  "M 570 448 C 610 436, 668 440, 698 458",
  "M 585 470 C 620 462, 660 466, 685 478",
];
const CALLOSUM = "M 300 275 C 310 210, 430 188, 545 210 C 600 222, 625 255, 610 292";

export const NODE = {
  vta: [488, 395] as P,
  nacc: [330, 330] as P,
  dstr: [390, 270] as P,
  pfc: [180, 222] as P,
  ofc: [200, 330] as P,
};
// Wanting: from the midbrain up into the striatum and the front of the brain, then out into the cortex.
const WANT: Cubic[] = [
  [NODE.vta, [450, 385], [380, 360], NODE.nacc],
  [NODE.vta, [470, 340], [430, 300], NODE.dstr],
  [NODE.vta, [420, 330], [300, 260], NODE.pfc],
  [NODE.nacc, [290, 330], [240, 335], NODE.ofc],
  [NODE.dstr, [380, 200], [350, 150], [320, 108]],
  [NODE.dstr, [440, 220], [500, 170], [540, 120]],
  [NODE.pfc, [165, 190], [175, 160], [205, 135]],
  [NODE.nacc, [300, 300], [262, 272], [240, 250]],
  [NODE.vta, [530, 360], [580, 320], [630, 240]],
];
export const HOTSPOTS: P[] = [
  [338, 342],
  [374, 362],
  [206, 320],
  [503, 470],
];

const bez = (c: Cubic, u: number): P => {
  const v = 1 - u;
  return [
    v * v * v * c[0][0] + 3 * v * v * u * c[1][0] + 3 * v * u * u * c[2][0] + u * u * u * c[3][0],
    v * v * v * c[0][1] + 3 * v * v * u * c[1][1] + 3 * v * u * u * c[2][1] + u * u * u * c[3][1],
  ];
};
const cubicD = (c: Cubic) => `M ${c[0][0]} ${c[0][1]} C ${c[1][0]} ${c[1][1]}, ${c[2][0]} ${c[2][1]}, ${c[3][0]} ${c[3][1]}`;

export type BrainState = {
  draw: number; // outline drawn 0..1
  o: number;
  like: number; // hotspots 0..1
  want: number; // network grown 0..1
  flow: number; // pulse speed / brightness 0..1
  know: number; // the front glows (knowing) 0..1
  flash?: number; // a sudden surge of wanting 0..1
  ghost?: boolean; // faint, line only (foreshadowing in chapter 1)
};

// Screen position of a local brain point when the brain is drawn centred at (x, y) with scale s.
export const bpt = (x: number, y: number, s: number, p: P): P => [x + s * (p[0] - 400), y + s * (p[1] - 300)];

export const BrainSvg: React.FC<{ x: number; y: number; s: number; st: BrainState; t: number; id: string }> = ({ x, y, s, st, t, id }) => {
  if (st.o <= 0) return null;
  const flash = st.flash ?? 0;
  const line = st.ghost ? K.wantHi : "#a9c3e8";
  return (
    <g transform={`translate(${x - 400 * s} ${y - 300 * s}) scale(${s})`} opacity={st.o}>
      <defs>
        <radialGradient id={`${id}-know`}>
          <stop offset="0%" stopColor={K.know} stopOpacity={0.75} />
          <stop offset="45%" stopColor={K.know} stopOpacity={0.22} />
          <stop offset="100%" stopColor={K.know} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-like`}>
          <stop offset="0%" stopColor={K.like} stopOpacity={0.95} />
          <stop offset="40%" stopColor={K.like} stopOpacity={0.3} />
          <stop offset="100%" stopColor={K.like} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-want`}>
          <stop offset="0%" stopColor={K.want} stopOpacity={0.55} />
          <stop offset="100%" stopColor={K.want} stopOpacity={0} />
        </radialGradient>
      </defs>
      {!st.ghost ? <path d={OUTER} fill="#0b1322" fillOpacity={0.72 * clamp01(st.draw * 1.5)} /> : null}
      {!st.ghost ? <path d={CEREBELLUM} fill="#0b1322" fillOpacity={0.72 * clamp01(st.draw * 1.5 - 0.3)} /> : null}
      <g fill="none" stroke={line} strokeLinecap="round">
        <path d={OUTER} strokeWidth={3.2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - st.draw} strokeOpacity={0.75} />
        <path d={CEREBELLUM} strokeWidth={2.4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(st.draw * 1.4 - 0.4)} strokeOpacity={0.6} />
        <path d={STEM} strokeWidth={2.4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(st.draw * 1.4 - 0.4)} strokeOpacity={0.55} />
        {FOLDS.map((d, i) => (
          <path key={i} d={d} strokeWidth={1.8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(st.draw * 1.6 - 0.5 - i * 0.02)} strokeOpacity={0.28} />
        ))}
        {!st.ghost ? <path d={CALLOSUM} strokeWidth={12} strokeOpacity={0.1 * clamp01(st.draw * 2 - 1)} /> : null}
      </g>
      {/* knowing: the front of the brain */}
      {st.know > 0 ? <circle cx={NODE.pfc[0]} cy={NODE.pfc[1] - 10} r={150} fill={`url(#${id}-know)`} opacity={st.know} /> : null}
      {/* wanting: a large network from the midbrain */}
      {st.want > 0 ? (
        <g>
          <circle cx={NODE.nacc[0] + 40} cy={NODE.nacc[1] - 10} r={260} fill={`url(#${id}-want)`} opacity={0.35 * st.want + 0.5 * flash} />
          {WANT.map((c, i) => {
            const g = clamp01(st.want * 1.6 - i * 0.07);
            if (g <= 0) return null;
            const d = cubicD(c);
            return (
              <g key={i} fill="none" strokeLinecap="round">
                <path d={d} stroke={K.want} strokeWidth={22} strokeOpacity={0.06 + 0.08 * flash} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - g} />
                <path d={d} stroke={K.want} strokeWidth={9} strokeOpacity={0.2 + 0.25 * flash} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - g} />
                <path d={d} stroke={K.wantHi} strokeWidth={3} strokeOpacity={0.9} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - g} />
              </g>
            );
          })}
          {WANT.map((c, i) =>
            [0, 0.5].map((off, j) => {
              const u = (t * (0.35 + 0.9 * st.flow) + off + i * 0.137) % 1;
              if (u > clamp01(st.want * 1.6 - i * 0.07)) return null;
              const [px, py] = bez(c, u);
              return <circle key={`${i}-${j}`} cx={px} cy={py} r={5 + 3 * flash} fill="#fff" opacity={0.55 + 0.4 * st.flow} />;
            }),
          )}
          <circle cx={NODE.vta[0]} cy={NODE.vta[1]} r={9} fill={K.wantHi} opacity={st.want} />
        </g>
      ) : null}
      {/* liking: a few tiny hotspots */}
      {st.like > 0
        ? HOTSPOTS.map(([hx, hy], i) => {
            const k = clamp01(st.like * 2 - i * 0.25);
            return (
              <g key={i} opacity={k}>
                <circle cx={hx} cy={hy} r={34} fill={`url(#${id}-like)`} />
                <circle cx={hx} cy={hy} r={5.5 * (0.6 + 0.4 * k)} fill={K.likeHi} />
              </g>
            );
          })
        : null}
    </g>
  );
};
