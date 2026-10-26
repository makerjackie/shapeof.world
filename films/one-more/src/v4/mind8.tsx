// Chapter 2 continued (story bars 25.5–43.5): two systems in the brain (on the quiet interlude); a slot machine's near
// miss is chance, a game's is real; so it is harder to let go (on the re-entry); one night as nine matches; the thumb
// moves before the head; the alarm (knowing) against the button (wanting).
import React from "react";
import { BrainSvg, bpt, HOTSPOTS } from "../brain";
import { Box, clamp01, EO, lerp, Note, ramp, Say, Tag, useT, win } from "../kit";
import { HAN, K, NUM } from "../theme";
import { GameBack } from "./ch1";
import { FightScreen } from "./fight";
import { LabDefs, SymSvg } from "./lab8";
import { BTN_W, PhoneShot } from "./phoneshot";
import { BEAT, beat, S } from "./time";

const KW_CAM = { cx: 0, cy: -175, z: 1.2 };
const want = (s: string) => ({ t: s, c: K.want });
const like = (s: string) => ({ t: s, c: K.like });
const know = (s: string) => ({ t: s, c: K.know });

// ---------- two systems ----------
const Brain2: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(25.5) - 0.1, S(30.05), 0.3, 0.3);
  if (o <= 0) return null;
  const x = 1230;
  const y = 560;
  const s = 1.18 + 0.05 * ramp(t, S(25.5), S(30), (u) => u);
  const flare = t > S(28.5) ? Math.exp(-(t - S(28.5)) * 1.2) : 0;
  const st = { draw: ramp(t, S(25.5), S(26.2), EO), o: 1, like: ramp(t, S(27), S(27.35), EO), want: ramp(t, S(27.4), S(28.0), EO), flow: 0.4 + 0.6 * flare, know: 0, flash: flare };
  const [lx, ly] = bpt(x, y, s, HOTSPOTS[0]);
  const [wx, wy] = bpt(x, y, s, [430, 150]);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack o={0.6} />
      <div style={{ position: "absolute", left: x - 520, top: y - 420, width: 1040, height: 840, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(150,90,200,0.22), rgba(60,40,120,0) 70%)" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <BrainSvg id="b2" x={x} y={y} s={s} st={st} t={t} />
      </svg>
      <Tag x={lx - 40} y={ly + 80} at={S(27)} out={S(30)} color={K.like} size={36} anchor="right">
        喜欢 · 几个小点
      </Tag>
      <Tag x={wx + 50} y={wy - 50} at={S(27.4)} out={S(30)} color={K.want} size={36} anchor="left">
        想要 · 一大片
      </Tag>
      <Note at={S(25.7)} out={S(29.9)}>想要与喜欢：Berridge &amp; Robinson, American Psychologist 2016（理论；"几个小点"来自大鼠研究）· 脑区位置为示意</Note>
    </div>
  );
};

// ---------- a slot machine's near miss is chance; a game's is real ----------
const RealFake: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(30), S(32.05), 0.25, 0.25);
  if (o <= 0) return null;
  const kl = ramp(t, S(30.05), S(30.35), EO);
  const kr = ramp(t, S(30.7), S(31.0), EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      {/* left: three reels, the third star one below the line */}
      <div style={{ position: "absolute", left: 160, top: 300, width: 720, height: 420, borderRadius: 30, background: "linear-gradient(180deg, #3b2a6b, #1a1036)", border: "4px solid #e8c36a", opacity: kl, transform: `scale(${0.9 + 0.1 * kl})` }}>
        <svg width={720} height={300} style={{ position: "absolute", left: 0, top: 30 }}>
          <LabDefs />
          <rect x={60} y={20} width={600} height={260} rx={20} fill="#fdf8ee" />
          <line x1={50} x2={670} y1={130} y2={130} stroke="#e0203f" strokeWidth={4} strokeDasharray="12 8" />
          <SymSvg s="star" x={160} y={130} />
          <SymSvg s="star" x={360} y={130} />
          <SymSvg s="cherry" x={560} y={130} />
          <SymSvg s="star" x={560} y={232} />
          <circle cx={560} cy={232} r={44} fill="none" stroke={K.want} strokeWidth={5} />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#aeb6c8" }}>老虎机 · 纯靠运气</div>
      </div>
      {/* right: the crystal at 1%, the match we really almost won */}
      <div style={{ position: "absolute", left: 1040, top: 300, width: 720, height: 420, borderRadius: 30, overflow: "hidden", border: `4px solid ${K.want}`, opacity: kr, transform: `scale(${0.9 + 0.1 * kr})`, boxShadow: `0 0 40px rgba(255,79,154,${0.4 * kr})` }}>
        <div style={{ position: "absolute", left: -195, top: -50, width: 1110, height: 520, transform: "scale(0.8)", transformOrigin: "50% 40%" }}>
          <FightScreen t={beat(3.62)} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90, background: "linear-gradient(180deg, rgba(5,7,12,0), rgba(5,7,12,0.92))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 40, color: "#fff" }}>游戏 · 真的只差一点</div>
      </div>
    </div>
  );
};

// ---------- so, harder to let go: the phone mid-fight, the thumb at work ----------
const OwnHands: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(32), S(33.55), 0.2, 0.3);
  if (o <= 0) return null;
  const local = (t - S(32)) % 2.4;
  const beatK = Math.exp(-(((t - S(32)) / (BEAT / 2)) % 1) / 0.2);
  const tips: [number, number][] = [
    [430, 30],
    [330, 70],
    [360, -30],
  ];
  const tip = tips[Math.floor((t - S(32)) / (BEAT / 2)) % 3];
  return <PhoneShot t={t} o={o} screen="fight" fightT={0.3 + local} thumb={{ x: tip[0], y: tip[1], s: 1.06 - 0.06 * beatK, o: 1 }} />;
};

// ---------- one night, nine matches ----------
type Night = { time: string; res: "胜" | "负" | "差一点"; fun: number; want: number };
const NIGHT: Night[] = [
  { time: "22:03", res: "胜", fun: 0.9, want: 0.5 },
  { time: "22:24", res: "负", fun: 0.82, want: 0.55 },
  { time: "22:46", res: "差一点", fun: 0.7, want: 0.86 },
  { time: "23:10", res: "胜", fun: 0.68, want: 0.6 },
  { time: "23:34", res: "负", fun: 0.56, want: 0.62 },
  { time: "23:58", res: "差一点", fun: 0.48, want: 0.9 },
  { time: "00:27", res: "负", fun: 0.38, want: 0.66 },
  { time: "00:56", res: "差一点", fun: 0.28, want: 0.93 },
  { time: "01:47", res: "差一点", fun: 0.16, want: 0.97 },
];
const NightCards: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(33.5), S(37.55), 0.25, 0.3);
  if (o <= 0) return null;
  const CW = 170;
  const GAP = 20;
  const x0 = 960 - (9 * CW + 8 * GAP) / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <div style={{ position: "absolute", left: x0, top: 350, display: "flex", gap: 22, alignItems: "center", fontFamily: HAN, fontWeight: 800, fontSize: 26 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: K.like }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, background: K.like }} />喜欢
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: K.want }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, background: K.want }} />想要
        </span>
      </div>
      {NIGHT.map((n, i) => {
        const at = S(33.6) + i * BEAT * 1.2;
        const k = EO(clamp01((t - at) / 0.25));
        if (k <= 0) return null;
        const near = n.res === "差一点";
        const pulse = near ? 0.5 + 0.5 * Math.sin(t * 8 + i) : 0;
        const grow = EO(clamp01((t - at - 0.08) / 0.4));
        const last = i === 8;
        return (
          <div key={i} style={{ position: "absolute", left: x0 + i * (CW + GAP), top: 410 + (1 - k) * 60, width: CW, height: 400, opacity: k, borderRadius: 18, background: "linear-gradient(180deg, #223163, #121a3a)", border: `2px solid ${near ? `rgba(255,79,154,${0.5 + 0.5 * pulse})` : "rgba(232,195,106,0.5)"}`, boxShadow: near ? `0 0 ${20 * pulse}px rgba(255,79,154,0.5)` : "none", transform: last ? `scale(${1 + 0.06 * ramp(t, S(36.5), S(36.8), EO)})` : undefined }}>
            <div style={{ textAlign: "center", fontFamily: NUM, fontWeight: 700, fontSize: 26, color: last ? "#fff" : "#c9d3e6", marginTop: 14 }}>{n.time}</div>
            <div style={{ textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: near ? 26 : 30, color: n.res === "胜" ? "#ffd166" : near ? K.wantHi : "#aeb6c8", marginTop: 6 }}>{n.res}</div>
            <div style={{ position: "absolute", left: 30, right: 30, bottom: 22, height: 250, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ width: 46, height: `${n.fun * 100 * grow}%`, borderRadius: 8, background: `linear-gradient(180deg, ${K.likeHi}, ${K.like})` }} />
              <div style={{ width: 46, height: `${n.want * 100 * grow}%`, borderRadius: 8, background: `linear-gradient(180deg, ${K.wantHi}, ${K.want})`, boxShadow: `0 0 14px ${K.want}88` }} />
            </div>
          </div>
        );
      })}
      <Note at={S(33.7)} out={S(37.4)}>示意：一个人一夜里的"喜欢"和"想要"</Note>
    </div>
  );
};

// ---------- the thumb moves first ----------
const Habit: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(37.5), S(39.55), 0.25, 0.2);
  if (o <= 0) return null;
  const n = Math.max(0, Math.floor((t - S(37.7)) / BEAT));
  const since = t >= S(37.7) ? (t - S(37.7)) % BEAT : 9;
  const press = Math.exp(-since / 0.08);
  const down = since < BEAT * 0.45 ? 1 : 0;
  const hover: [number, number] = [262, 108];
  const tip: [number, number] = down ? [BTN_W[0] + 6, BTN_W[1] + 8] : hover;
  const flash = Math.exp(-since / 0.12) * (t >= S(37.7) ? 1 : 0);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PhoneShot t={t} o={o} screen="result" press={press} matching={0.85 * flash} beatPhase={(since / BEAT) % 1} thumb={{ x: lerp(hover[0], tip[0], ramp(since, 0, 0.12)), y: lerp(hover[1], tip[1], ramp(since, 0, 0.12)), s: 1.06 - 0.06 * press, o: 1 }} />
      <div style={{ position: "absolute", right: 120, top: 70, opacity: o, display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 30, color: K.sub }}>本周第</span>
        <span style={{ fontFamily: NUM, fontWeight: 300, fontSize: 96, color: K.fg, fontVariantNumeric: "tabular-nums" }}>{41 + n}</span>
        <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 30, color: K.sub }}>局</span>
      </div>
      <Note at={S(37.7)} out={S(39.45)}>Lei 等，Journal of Behavioral Addictions 2025：游戏障碍者做决定更依赖习惯，而不是目标（样本较小）</Note>
    </div>
  );
};

// ---------- knowing against wanting ----------
const KnowWant: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(39.5), S(43.55), 0.25, 0.3);
  if (o <= 0) return null;
  const lossK = ramp(t, S(42), S(42.3), EO);
  const fast = 1 + 2.5 * lossK;
  const beatPhase = (((t - S(39.5)) * fast) / BEAT) % 1;
  const ax = 960 + KW_CAM.z * (0 - KW_CAM.cx);
  const ay = 540 + KW_CAM.z * (-374 - KW_CAM.cy);
  const bx = 960 + KW_CAM.z * (BTN_W[0] - KW_CAM.cx);
  const by = 540 + KW_CAM.z * (BTN_W[1] - KW_CAM.cy);
  const kO = ramp(t, S(39.7), S(40.0), EO) * (1 - 0.65 * lossK);
  const wO = ramp(t, S(40.55), S(40.85), EO);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <PhoneShot t={t} o={o} cam={KW_CAM} screen="result" alarm={1} beatPhase={beatPhase} thumb={{ x: 262, y: 108, s: 1.06, o: 1 }} />
      <div style={{ position: "absolute", left: ax, top: ay - 170, transform: "translateX(-50%)", opacity: o * kO, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 52, lineHeight: 1.2, color: K.know }}>知道</span>
        <span style={{ width: 3, height: 70, background: K.know, opacity: 0.6 }} />
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
  if (t < S(25.5) - 0.2 || t > S(43.5) + 0.2) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Brain2 t={t} />
      <RealFake t={t} />
      <OwnHands t={t} />
      <NightCards t={t} />
      <Habit t={t} />
      <KnowWant t={t} />
      <Mind8Text />
    </div>
  );
};

const band = { background: "rgba(5,7,12,0.7)", padding: "2px 26px", borderRadius: 16 };

const Mind8Text: React.FC = () => (
  <>
    <Box x={110} y={360} gap={14}>
      <Say at={S(25.6)} out={S(26.95)} size={62} weight={900} parts={["其实，", want("“想要”"), "和", like("“喜欢”"), "，"]} />
      <Say at={S(26.0)} out={S(26.95)} size={62} weight={900} parts={["是大脑里两套不同的系统。"]} />
    </Box>
    <Box x={110} y={360} gap={14}>
      <Say at={S(27.0)} out={S(28.45)} size={56} weight={800} parts={["管", like("“喜欢”"), "的，只是几个小点；"]} />
      <Say at={S(27.45)} out={S(28.45)} size={56} weight={800} parts={["管", want("“想要”"), "的，是一大片。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={S(28.5)} out={S(29.95)} size={70} weight={900} parts={[want("“差一点”"), "，"]} />
      <Say at={S(28.85)} out={S(29.95)} size={70} weight={900} parts={["更像是在点燃", want("“想要”"), "。"]} />
    </Box>
    <Box x={960} y={110} align="center" gap={12}>
      <Say at={S(30.1)} out={S(31.95)} size={58} weight={900} parts={["老虎机的", want("“差一点”"), "，是机器转出来的；"]} />
      <Say at={S(30.75)} out={S(31.95)} size={58} weight={900} parts={["游戏里的", want("“差一点”"), "，是你自己打出来的。"]} />
    </Box>
    <Box x={110} y={430} gap={14}>
      <Say at={S(32.05)} out={S(33.45)} size={82} weight={900} parts={["所以，", want("更放不下"), "。"]} />
    </Box>
    <Box x={960} y={110} align="center" gap={12}>
      <Say at={S(33.7)} out={S(36.4)} size={56} weight={900} parts={["一晚上，每一个", want("“差一点”"), "，都在推你", want("再来"), "；"]} />
      <Say at={S(34.6)} out={S(36.4)} size={56} weight={900} parts={[like("“喜欢”"), "，却不一定跟着涨。"]} />
    </Box>
    <Box x={960} y={150} align="center">
      <Say at={S(36.5)} out={S(37.45)} size={76} weight={900} parts={["凌晨 ", { t: "1:47", num: true }, "，就是这么来的。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={S(37.6)} out={S(39.45)} size={62} weight={900} parts={["重复得够多，"]} />
      <Say at={S(37.95)} out={S(39.45)} size={62} weight={900} parts={["拇指会比", know("脑子"), "先动。"]} />
    </Box>
    <Box x={960} y={935} align="center">
      <Say at={S(39.6)} out={S(40.5)} size={56} weight={900} parts={["明知道明天 ", { t: "7:30", num: true }, " 要起床。"]} style={band} />
    </Box>
    <Box x={960} y={935} align="center">
      <Say at={S(40.55)} out={S(41.95)} size={56} weight={900} parts={[know("“知道”"), "讲道理，很慢；", want("“想要”"), "不讲道理，很快。"]} style={band} />
    </Box>
    <Box x={960} y={935} align="center">
      <Say at={S(42.0)} out={S(43.45)} size={56} weight={900} parts={["刚输的那一秒，", want("想要"), "已经到了，", know("知道"), "还在路上。"]} style={band} />
    </Box>
  </>
);
