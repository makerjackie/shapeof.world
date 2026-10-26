// Chapter 2 continued (track bars 42–64): two systems in the brain; every match is played with your own hands; one
// night told as nine matches (fun shrinking, wanting growing); the thumb learns before the head; the alarm (knowing)
// against the button (wanting).
import React from "react";
import { BrainSvg, bpt, HOTSPOTS } from "../brain";
import { Box, clamp01, EO, lerp, Note, ramp, Say, Tag, useT, win } from "../kit";
import { HAN, K, NUM } from "../theme";
import { GameBack } from "./ch1";
import { BTN_W, PhoneShot } from "./phoneshot";

const KW_CAM = { cx: 0, cy: -175, z: 1.2 };
import { BEAT, T } from "./time";

const want = (s: string) => ({ t: s, c: K.want });
const like = (s: string) => ({ t: s, c: K.like });
const know = (s: string) => ({ t: s, c: K.know });

// ---------- two systems ----------
const Brain2: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(42) - 0.1, T(48.05), 0.35, 0.3);
  if (o <= 0) return null;
  const x = 1230;
  const y = 560;
  const s = 1.18 + 0.05 * ramp(t, T(42), T(48), (u) => u);
  const flare = t > T(46) ? Math.exp(-(t - T(46)) * 1.2) : 0;
  const st = { draw: ramp(t, T(42), T(42.8), EO), o: 1, like: ramp(t, T(44), T(44.5), EO), want: ramp(t, T(44.8), T(45.6), EO), flow: 0.4 + 0.6 * flare, know: 0, flash: flare };
  const [lx, ly] = bpt(x, y, s, HOTSPOTS[0]);
  const [wx, wy] = bpt(x, y, s, [430, 150]);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack o={0.6} />
      <div style={{ position: "absolute", left: x - 520, top: y - 420, width: 1040, height: 840, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(150,90,200,0.22), rgba(60,40,120,0) 70%)" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <BrainSvg id="b2" x={x} y={y} s={s} st={st} t={t} />
      </svg>
      <Tag x={lx - 40} y={ly + 80} at={T(44)} out={T(48)} color={K.like} size={36} anchor="right">
        喜欢 · 几个小点
      </Tag>
      <Tag x={wx + 50} y={wy - 50} at={T(44.8)} out={T(48)} color={K.want} size={36} anchor="left">
        想要 · 一大片
      </Tag>
      <Note at={T(42.2)} out={T(47.9)}>想要与喜欢：Berridge &amp; Robinson, American Psychologist 2016（理论，证据主要来自动物研究）· 脑区位置为示意</Note>
    </div>
  );
};

// ---------- with your own hands ----------
const OwnHands: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(48), T(50.05), 0.25, 0.3);
  if (o <= 0) return null;
  const local = (t - T(48)) % 2.4;
  const beatK = Math.exp(-(((t - T(48)) / (BEAT / 2)) % 1) / 0.2);
  const tips: [number, number][] = [
    [430, 30],
    [330, 70],
    [360, -30],
  ];
  const tip = tips[Math.floor((t - T(48)) / (BEAT / 2)) % 3];
  return <PhoneShot t={t} o={o} screen="fight" fightT={0.3 + local} thumb={{ x: tip[0], y: tip[1], s: 1.06 - 0.06 * beatK, o: 1 }} />;
};

// ---------- one night, nine matches ----------
type Night = { time: string; res: "胜" | "负" | "差一点"; fun: number; want: number };
const NIGHT: Night[] = [
  { time: "22:03", res: "胜", fun: 0.9, want: 0.5 },
  { time: "22:24", res: "负", fun: 0.84, want: 0.52 },
  { time: "22:46", res: "差一点", fun: 0.72, want: 0.66 },
  { time: "23:10", res: "胜", fun: 0.68, want: 0.62 },
  { time: "23:34", res: "负", fun: 0.56, want: 0.7 },
  { time: "23:58", res: "差一点", fun: 0.46, want: 0.8 },
  { time: "00:27", res: "负", fun: 0.38, want: 0.82 },
  { time: "00:56", res: "差一点", fun: 0.27, want: 0.9 },
  { time: "01:47", res: "差一点", fun: 0.16, want: 0.97 },
];
const NightCards: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(50), T(56.05), 0.3, 0.3);
  if (o <= 0) return null;
  const CW = 170;
  const GAP = 20;
  const x0 = 960 - (9 * CW + 8 * GAP) / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <div style={{ position: "absolute", left: x0, top: 350, display: "flex", gap: 22, alignItems: "center", fontFamily: HAN, fontWeight: 800, fontSize: 26 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: K.like }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, background: K.like }} />开心
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: K.want }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, background: K.want }} />想再来
        </span>
      </div>
      {NIGHT.map((n, i) => {
        const at = T(50.2) + i * BEAT * 1.6;
        const k = EO(clamp01((t - at) / 0.3));
        if (k <= 0) return null;
        const near = n.res === "差一点";
        const pulse = near ? 0.5 + 0.5 * Math.sin(t * 8 + i) : 0;
        const grow = EO(clamp01((t - at - 0.1) / 0.45));
        const last = i === 8;
        return (
          <div key={i} style={{ position: "absolute", left: x0 + i * (CW + GAP), top: 410 + (1 - k) * 60, width: CW, height: 400, opacity: k, borderRadius: 18, background: "linear-gradient(180deg, #223163, #121a3a)", border: `2px solid ${near ? `rgba(255,79,154,${0.5 + 0.5 * pulse})` : "rgba(232,195,106,0.5)"}`, boxShadow: near ? `0 0 ${20 * pulse}px rgba(255,79,154,0.5)` : "none", transform: last ? `scale(${1 + 0.06 * ramp(t, T(54.5), T(54.9), EO)})` : undefined }}>
            <div style={{ textAlign: "center", fontFamily: NUM, fontWeight: 700, fontSize: 26, color: last ? "#fff" : "#c9d3e6", marginTop: 14 }}>{n.time}</div>
            <div style={{ textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: near ? 26 : 30, color: n.res === "胜" ? "#ffd166" : near ? K.wantHi : "#aeb6c8", marginTop: 6 }}>{n.res}</div>
            <div style={{ position: "absolute", left: 30, right: 30, bottom: 22, height: 250, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ width: 46, height: `${n.fun * 100 * grow}%`, borderRadius: 8, background: `linear-gradient(180deg, ${K.likeHi}, ${K.like})` }} />
              <div style={{ width: 46, height: `${n.want * 100 * grow}%`, borderRadius: 8, background: `linear-gradient(180deg, ${K.wantHi}, ${K.want})`, boxShadow: `0 0 14px ${K.want}88` }} />
            </div>
          </div>
        );
      })}
      <Note at={T(50.3)} out={T(55.9)}>示意：一个人一夜里的"开心"和"想再来"</Note>
    </div>
  );
};

// ---------- the thumb learns first ----------
const Habit: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(56), T(60.05), 0.3, 0.25);
  if (o <= 0) return null;
  const n = Math.max(0, Math.floor((t - T(56.3)) / BEAT));
  const since = t >= T(56.3) ? ((t - T(56.3)) % BEAT) : 9;
  const press = Math.exp(-since / 0.08);
  const down = since < BEAT * 0.45 ? 1 : 0;
  const hover: [number, number] = [262, 108];
  const tip: [number, number] = down ? [BTN_W[0] + 6, BTN_W[1] + 8] : hover;
  const flash = Math.exp(-since / 0.12) * (t >= T(56.3) ? 1 : 0);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PhoneShot t={t} o={o} screen="result" press={press} matching={0.85 * flash} beatPhase={(since / BEAT) % 1} thumb={{ x: lerp(hover[0], tip[0], ramp(since, 0, 0.12)), y: lerp(hover[1], tip[1], ramp(since, 0, 0.12)), s: 1.06 - 0.06 * press, o: 1 }} />
      <div style={{ position: "absolute", right: 120, top: 70, opacity: o, display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 30, color: K.sub }}>本周第</span>
        <span style={{ fontFamily: NUM, fontWeight: 300, fontSize: 96, color: K.fg, fontVariantNumeric: "tabular-nums" }}>{41 + n}</span>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 30, color: K.sub }}>局</span>
      </div>
      <Note at={T(56.4)} out={T(59.9)}>Lei 等，Journal of Behavioral Addictions 2025：游戏障碍者做决定更依赖习惯，而不是目标</Note>
    </div>
  );
};

// ---------- knowing against wanting ----------
const KnowWant: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, T(60), T(64.05), 0.3, 0.3);
  if (o <= 0) return null;
  const lossK = ramp(t, T(62.5), T(62.8), EO);
  const fast = 1 + 2.5 * lossK;
  const beatPhase = (((t - T(60)) * fast) / BEAT) % 1;
  // labels: 知道 above the alarm, 想要 under the button
  const ax = 960 + KW_CAM.z * (0 - KW_CAM.cx);
  const ay = 540 + KW_CAM.z * (-374 - KW_CAM.cy);
  const bx = 960 + KW_CAM.z * (BTN_W[0] - KW_CAM.cx);
  const by = 540 + KW_CAM.z * (BTN_W[1] - KW_CAM.cy);
  const kO = ramp(t, T(60.4), T(60.8), EO) * (1 - 0.65 * lossK);
  const wO = ramp(t, T(61.4), T(61.8), EO);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PhoneShot t={t} o={o} cam={KW_CAM} screen="result" alarm={1} beatPhase={beatPhase} thumb={{ x: 262, y: 108, s: 1.06, o: 1 }} />
      <div style={{ position: "absolute", left: ax - 290, top: ay - 44, transform: "translateX(-100%)", opacity: o * kO, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 52, color: K.know }}>知道</span>
        <span style={{ width: 60, height: 3, background: K.know, opacity: 0.6 }} />
      </div>
      <div style={{ position: "absolute", left: bx + 170, top: by - 40, opacity: o * wO, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 50, height: 3, background: K.want, opacity: 0.7 }} />
        <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 48 * (1 + 0.15 * lossK * (0.5 + 0.5 * Math.sin(t * 16))), color: K.want, textShadow: `0 0 ${24 * lossK}px ${K.want}` }}>想要</span>
      </div>
    </div>
  );
};

export const Mind8: React.FC = () => {
  const t = useT();
  if (t < T(42) - 0.2 || t > T(64) + 0.2) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Brain2 t={t} />
      <OwnHands t={t} />
      <NightCards t={t} />
      <Habit t={t} />
      <KnowWant t={t} />
      <Mind8Text />
    </div>
  );
};

const Mind8Text: React.FC = () => (
  <>
    <Box x={110} y={360} gap={14}>
      <Say at={T(42.1)} out={T(43.95)} size={62} weight={900} parts={["大脑里，", want("“想要”"), "和", like("“喜欢”"), "，"]} />
      <Say at={T(42.6)} out={T(43.95)} size={62} weight={900} parts={["是两套不同的系统。"]} />
    </Box>
    <Box x={110} y={360} gap={14}>
      <Say at={T(44.05)} out={T(45.95)} size={56} weight={800} parts={["管", like("喜欢"), "的，只是几个小点；"]} />
      <Say at={T(44.85)} out={T(45.95)} size={56} weight={800} parts={["管", want("想要"), "的，是一大片。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={T(46.05)} out={T(47.9)} size={70} weight={900} parts={[want("“差一点”"), "点燃的，"]} />
      <Say at={T(46.5)} out={T(47.9)} size={70} weight={900} parts={["是", want("“想要”"), "。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={T(48.1)} out={T(49.95)} size={62} weight={900} parts={["而游戏里，"]} />
      <Say at={T(48.5)} out={T(49.95)} size={62} weight={900} parts={["每一局都是你", want("亲手打的"), "。"]} />
    </Box>
    <Box x={960} y={110} align="center" gap={12}>
      <Say at={T(50.3)} out={T(54.4)} size={56} weight={900} parts={["一晚上，每一个", want("“差一点”"), "，都把", want("想要"), "推高一点；"]} />
      <Say at={T(52.3)} out={T(54.4)} size={56} weight={900} parts={[like("开心"), "却一直在往下走。"]} />
    </Box>
    <Box x={960} y={150} align="center">
      <Say at={T(54.5)} out={T(55.95)} size={76} weight={900} parts={["这就是凌晨 ", { t: "1:47", num: true }, " 的你。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={T(56.3)} out={T(59.9)} size={62} weight={900} parts={["重复几百次以后，"]} />
      <Say at={T(56.9)} out={T(59.9)} size={62} weight={900} parts={["拇指比", know("脑子"), "先学会。"]} />
    </Box>
    <Box x={960} y={935} align="center">
      <Say at={T(60.15)} out={T(60.98)} size={56} weight={900} parts={["明知道明天 ", { t: "7:30", num: true }, " 要起床。"]} style={{ background: "rgba(5,7,12,0.7)", padding: "2px 26px", borderRadius: 16 }} />
    </Box>
    <Box x={960} y={935} align="center">
      <Say at={T(61.05)} out={T(62.42)} size={56} weight={900} parts={[know("“知道”"), "很慢，要想；", want("“想要”"), "很快，不用想。"]} style={{ background: "rgba(5,7,12,0.7)", padding: "2px 26px", borderRadius: 16 }} />
    </Box>
    <Box x={960} y={935} align="center">
      <Say at={T(62.5)} out={T(63.95)} size={56} weight={900} parts={["刚输的那一秒，", want("想要"), "已经到了，", know("知道"), "还在路上。"]} style={{ background: "rgba(5,7,12,0.7)", padding: "2px 26px", borderRadius: 16 }} />
    </Box>
  </>
);

