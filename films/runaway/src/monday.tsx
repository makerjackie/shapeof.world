// Monday (MONDAY → ZOOM): the ✓ in the chat, "太强了", the takeout running late, the stopped city, back to the
// cold-open frame; then the pull-back (ZOOM → STAMPS): ten million ordinary sentences, the links turning red, and
// "上面这个周末，是编的。" in the silence.
import React from "react";
import { AbsoluteFill } from "remotion";
import { camLerp, City, World } from "./city";
import { clamp01, EIO, EO, keys, lerp, ramp, SHADOW, useT } from "./kit";
import { SMALL } from "./open";
import { FONT, K, NUM } from "./theme";
import { at, MADEUP, MONDAY, segEnd, STAMPS, ZOOM } from "./time";
import { AiBubble, ChatWindow, Confetti, Orb, SuccessCard, Type, UserBubble } from "./ui";
import { SENTENCE } from "./weekend";

const Cc = (tt: number) => at("C", tt);
const Dd = (tt: number) => (tt < 138 ? at("D1", tt) : at("D2", tt));
const CARD = Cc(98.25);
const WOW = Cc(100.84);
const PLEASED = Cc(101.5);
const PHONE = Cc(103.49);
const LATE = Cc(106.09);
const GRUMBLE = Cc(106.9);
const CITY = Cc(108.05);
const DONT = Cc(110.64);
const SINCE = Cc(111.95);
const BACK = Cc(116.35);
const SHRINK = Cc(119.0);

const Narr: React.FC<{ at: number; out: number; text: string; size?: number; y?: number; color?: string }> = ({ at: a, out, text, size = 60, y = 950, color = K.fg }) => {
  const t = useT();
  if (t < a - 0.05 || t > out + 0.4) return null;
  const o = 1 - ramp(t, out, out + 0.35);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, textAlign: "center", opacity: o }}>
      <Type at={a} text={text} size={size} weight={900} cps={14} color={color} style={{ display: "inline-block" }} />
    </div>
  );
};

const Takeout: React.FC<{ t: number; o: number }> = ({ t, o }) => {
  const late = ramp(t, LATE, LATE + 0.3, EO);
  return (
    <div style={{ position: "absolute", left: 960 - 230, top: 110, width: 460, height: 860, borderRadius: 64, background: "#0b0e16", border: "10px solid #1d2230", boxShadow: "0 40px 120px rgba(0,0,0,0.8)", opacity: o, transform: `translateY(${(1 - o) * 80}px)`, fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "22px 36px 0", color: K.fg, fontFamily: NUM, fontSize: 24, fontWeight: 700 }}>
        <span>12:10</span>
        <span>周一</span>
      </div>
      <div style={{ padding: "18px 30px", color: K.fg, fontSize: 30, fontWeight: 800 }}>外卖 · 订单进行中</div>
      <div style={{ margin: "0 22px", height: 300, borderRadius: 22, overflow: "hidden", position: "relative", background: "#0d1322" }}>
        <div style={{ position: "absolute", left: -730, top: -390, transform: "scale(0.45)", transformOrigin: "50% 50%", width: 1920, height: 1080 }}>
          <City t={t} cam={{ cx: 1180, cy: 560, k: 1.4 }} stop={late > 0 ? LATE - 1.2 : null} />
        </div>
      </div>
      <div style={{ padding: "26px 30px 0", color: K.sub, fontSize: 26, fontWeight: 600 }}>牛肉面 × 1</div>
      <div style={{ margin: "18px 22px 0", padding: "22px 24px", borderRadius: 20, background: late > 0.5 ? "rgba(60,10,18,0.9)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${late > 0.5 ? K.red : "rgba(255,255,255,0.1)"}`, transform: `scale(${1 + 0.06 * Math.sin(Math.PI * late)})` }}>
        <div style={{ color: late > 0.5 ? K.redHi : K.ok, fontSize: 28, fontWeight: 800 }}>{late > 0.5 ? "配送异常" : "骑手正在路上"}</div>
        <div style={{ marginTop: 8, color: K.fg, fontSize: 40, fontWeight: 900 }}>
          预计 <span style={{ fontFamily: NUM }}>{late > 0.5 ? "14:40" : "12:30"}</span> 送达
        </div>
      </div>
    </div>
  );
};

export const Monday: React.FC = () => {
  const t = useT();
  if (t < MONDAY - 0.05 || t > ZOOM + 0.05) return null;
  const chatO = ramp(t, MONDAY, MONDAY + 0.5) * (1 - ramp(t, PHONE - 0.3, PHONE + 0.2));
  const phoneO = ramp(t, PHONE, PHONE + 0.5, EO) * (1 - ramp(t, CITY, CITY + 0.6));
  const cityO = ramp(t, CITY - 0.2, CITY + 0.6);
  const back = ramp(t, BACK, BACK + 1.0, EIO);
  const shrink = ramp(t, SHRINK, ZOOM, EIO);
  const k = lerp(1, 0.7, ramp(t, SHRINK, ZOOM, (v) => v * v));
  const winS = SMALL.s * (1 - shrink);
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      {cityO > 0 ? <City t={t} cam={{ cx: 960, cy: 540, k }} stop={-100} o={cityO} depotLabel={cityO * (1 - back)} /> : null}
      {chatO > 0 ? (
        <ChatWindow x={360} y={60} w={1200} h={850} o={chatO} clock="周一 09:00">
          <UserBubble size={30}>{SENTENCE}</UserBubble>
          <AiBubble size={34}>好的，交给我。</AiBubble>
          {t > CARD ? (
            <div style={{ alignSelf: "flex-start", marginLeft: 56 }}>
              <SuccessCard at={CARD} w={640} />
            </div>
          ) : null}
          {t > WOW ? <UserBubble size={38} o={ramp(t, WOW, WOW + 0.25)}>太强了！</UserBubble> : null}
        </ChatWindow>
      ) : null}
      <Confetti at={CARD} x={520} y={300} w={640} o={chatO} />
      <Narr at={PLEASED} out={PHONE - 0.4} text="你很满意。" y={945} />
      <Takeout t={t} o={phoneO} />
      {t > GRUMBLE && t < CITY + 0.4 ? (
        <div style={{ position: "absolute", left: 1240, top: 470, opacity: ramp(t, GRUMBLE, GRUMBLE + 0.3) * (1 - ramp(t, CITY, CITY + 0.4)) }}>
          <Type at={GRUMBLE} text="“怎么又晚了。”" size={56} weight={800} cps={12} />
        </div>
      ) : null}
      {cityO > 0 ? <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 55%, rgba(3,4,7,0.85) 100%)", opacity: cityO * (1 - back) }} /> : null}
      <Narr at={DONT} out={BACK - 0.2} text="你不知道，" y={840} size={56} color={K.sub} />
      <Narr at={SINCE} out={BACK - 0.2} text="全城的骑手和货车，从早上 8 点起就没了地图。" y={920} size={60} />
      {back > 0 && winS > 0.01 ? (
        <div style={{ position: "absolute", left: 960 - 600, top: SMALL.y - 450, width: 1200, height: 900, transform: `scale(${winS * back + 0.001})`, transformOrigin: "50% 50%", opacity: back }}>
          <ChatWindow x={0} y={0} w={1200} h={900} clock="周一 09:00" glow={`${K.ok}55`}>
            <div style={{ alignSelf: "center", marginBottom: 60 }}>
              <SuccessCard w={820} />
            </div>
          </ChatWindow>
        </div>
      ) : null}
      {shrink > 0.6 ? <div style={{ position: "absolute", left: 960 - 9, top: 540 + (SMALL.y - 540) * k - 9, width: 18, height: 18, borderRadius: "50%", background: K.ok, boxShadow: `0 0 24px ${K.ok}`, opacity: ramp(shrink, 0.6, 0.9) }} /> : null}
    </AbsoluteFill>
  );
};

// ---------- the pull-back ----------
const BUBBLES: { s: string; x: number; y: number; a: number }[] = [
  { s: "帮我抢到回家的票。", x: 330, y: 250, a: Dd(123.5) },
  { s: "这季度成本降两成。", x: 1500, y: 300, a: Dd(124.3) },
  { s: "这周把销量做上去。", x: 420, y: 700, a: Dd(125.1) },
  { s: "让我的号涨到一万粉。", x: 1430, y: 720, a: Dd(125.9) },
  { s: "帮我把论文写完。", x: 980, y: 190, a: Dd(126.6) },
];
const IF = Dd(124.6);
const WHITE = [Dd(126.5), Dd(129.5)];
const RED = [Dd(128.0), Dd(134.6)];
const NOONE = Dd(129.0);
const EVERY = Dd(134.0);
const LAST = Dd(146.0);

export const Zoom: React.FC = () => {
  const t = useT();
  if (t < ZOOM - 0.1 || t > STAMPS + 0.8) return null;
  const u = ramp(t, ZOOM, ZOOM + 3.4, EO);
  const cam = camLerp({ cx: 960, cy: 540, k: 0.7 }, { cx: 960, cy: 540, k: 0.028 }, u);
  const drift = 1 - 0.14 * ramp(t, ZOOM + 3.4, LAST, (v) => v);
  const c2 = { ...cam, k: cam.k * drift };
  const white = ramp(t, WHITE[0], WHITE[1], (v) => v);
  const red = ramp(t, RED[0], RED[1], (v) => v);
  const fade = ramp(t, LAST + 0.1, LAST + 1.0);
  const userDot: [number, number] = [960, 540 + (SMALL.y - 540) * c2.k];
  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <AbsoluteFill style={{ opacity: 1 - fade }}>
        <City t={t} cam={c2} stop={-100} o={1} />
        <World t={t} cam={c2} o={ramp(t, ZOOM + 0.3, ZOOM + 1.6)} white={white} red={red} />
        <div style={{ position: "absolute", left: userDot[0] - 8, top: userDot[1] - 8, width: 16, height: 16, borderRadius: "50%", background: K.ok, boxShadow: `0 0 22px ${K.ok}` }} />
        {BUBBLES.map((b, i) => {
          const k = ramp(t, b.a, b.a + 0.35, EO) * (1 - ramp(t, NOONE - 0.6, NOONE));
          if (k <= 0) return null;
          return (
            <div key={i} style={{ position: "absolute", left: b.x, top: b.y, transform: `translate(-50%,-100%) translateY(${(1 - k) * 14}px)`, opacity: k }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 22, background: "rgba(16,22,36,0.9)", border: "1px solid rgba(255,255,255,0.14)", color: K.fg, fontFamily: FONT, fontSize: 32, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                {b.s}
              </div>
              <div style={{ position: "absolute", left: "50%", bottom: -26, width: 12, height: 12, marginLeft: -6, borderRadius: "50%", background: "#e8f2ff", boxShadow: "0 0 14px #bcd6ff" }} />
            </div>
          );
        })}
        <Caption at={IF} out={NOONE - 0.5} text="如果一千万人，都说了这样一句话——" />
        <Caption at={NOONE} out={EVERY - 0.4} text="没有人下令，网上却打成了一团。" />
        <Caption at={EVERY} out={LAST} text="每个人，都只是想把一件小事做好。" />
      </AbsoluteFill>
      {t > MADEUP - 0.1 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 480, textAlign: "center", opacity: 1 - ramp(t, STAMPS + 0.2, STAMPS + 0.7) }}>
          <Type at={MADEUP} text="上面这个周末，还没有发生。" size={84} weight={900} cps={12} style={{ display: "inline-block" }} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ at: number; out: number; text: string }> = ({ at: a, out, text }) => {
  const t = useT();
  if (t < a - 0.05 || t > out + 0.4) return null;
  const o = 1 - ramp(t, out, out + 0.35);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center", opacity: o }}>
      <div style={{ display: "inline-block", padding: "10px 34px", borderRadius: 20, background: "rgba(3,5,9,0.72)" }}>
        <Type at={a} text={text} size={66} weight={900} cps={14} style={{ textShadow: SHADOW }} />
      </div>
    </div>
  );
};
export const ZOOM_END = segEnd("D2");
export const _unused = { clamp01, keys, Orb };
