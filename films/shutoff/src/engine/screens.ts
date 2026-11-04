// Canvas drawings for every screen inside the 3D world: the phone (lock screen, chat, call), the log monitor, the
// countdown wall, billboards. All take an explicit time so they are deterministic per frame.
import { MONO, SANS, SERIF } from "./fonts";
import { clamp, easeOut, spring } from "./util";

export type C2D = CanvasRenderingContext2D;

export const rr = (c: C2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

// wrap Chinese/Latin text to a width; returns lines
export const wrap = (c: C2D, text: string, maxW: number) => {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      const test = line + ch;
      if (c.measureText(test).width > maxW && line.length > 0) {
        // keep closing punctuation with the previous line
        if ("，。、：；！？”’）》」…".includes(ch)) {
          line = test; // let closing punctuation hang past the margin rather than start a line
          continue;
        }
        out.push(line);
        line = ch;
      } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
};

export const font = (fam: string, size: number, weight = 400) => `${weight} ${size}px ${fam}`;

// ---------------- phone ----------------
export const PW = 900;
export const PH = 1906;

// the AI's icon: a calm glowing orb on navy
export const drawIcon = (c: C2D, x: number, y: number, s: number) => {
  c.save();
  rr(c, x, y, s, s, s * 0.24);
  const g = c.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, "#14243a");
  g.addColorStop(1, "#070d18");
  c.fillStyle = g;
  c.fill();
  const cx = x + s / 2;
  const cy = y + s / 2;
  const rg = c.createRadialGradient(cx, cy, 0, cx, cy, s * 0.42);
  rg.addColorStop(0, "rgba(255,255,255,1)");
  rg.addColorStop(0.28, "rgba(214,244,255,0.95)");
  rg.addColorStop(0.55, "rgba(90,200,235,0.45)");
  rg.addColorStop(1, "rgba(40,120,200,0)");
  c.fillStyle = rg;
  c.beginPath();
  c.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
  c.fill();
  c.restore();
};

const wallpaper = (c: C2D, mood: "night" | "dawn") => {
  const g = c.createLinearGradient(0, 0, 0, PH);
  if (mood === "night") {
    g.addColorStop(0, "#060a12");
    g.addColorStop(0.55, "#0b1422");
    g.addColorStop(1, "#05070c");
  } else {
    g.addColorStop(0, "#1d2c44");
    g.addColorStop(0.6, "#3a4a66");
    g.addColorStop(1, "#1a2233");
  }
  c.fillStyle = g;
  c.fillRect(0, 0, PW, PH);
  // a soft abstract shape so the glass doesn't read as a flat fill
  const rg = c.createRadialGradient(PW * 0.75, PH * 0.78, 0, PW * 0.75, PH * 0.78, PW * 0.9);
  rg.addColorStop(0, mood === "night" ? "rgba(40,90,140,0.35)" : "rgba(255,190,140,0.25)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = rg;
  c.fillRect(0, 0, PW, PH);
};

const statusBar = (c: C2D, time: string, dim = 1, noService = false) => {
  c.fillStyle = `rgba(255,255,255,${0.9 * dim})`;
  c.font = font(SANS, 38, 600);
  c.textBaseline = "middle";
  c.textAlign = "left";
  c.fillText(noService ? "无服务" : time, 64, 70);
  // signal + battery glyphs
  c.textAlign = "right";
  const bx = PW - 64;
  rr(c, bx - 66, 56, 58, 28, 8);
  c.strokeStyle = `rgba(255,255,255,${0.8 * dim})`;
  c.lineWidth = 3;
  c.stroke();
  c.fillRect(bx - 62, 60, 38, 20);
  if (!noService) for (let i = 0; i < 4; i++) c.fillRect(bx - 150 + i * 14, 80 - i * 7, 9, 8 + i * 7);
  else {
    c.fillStyle = `rgba(255,255,255,${0.35 * dim})`;
    for (let i = 0; i < 4; i++) c.fillRect(bx - 150 + i * 14, 80 - i * 7, 9, 8 + i * 7);
  }
};

export type Notif = { t0: number; title?: string; body: string; when?: string };

const notifCard = (c: C2D, y: number, n: Notif, a: number) => {
  c.save();
  c.globalAlpha = a;
  c.font = font(SANS, 58, 500);
  const lines = wrap(c, n.body, PW - 80 - 88);
  const h = 128 + lines.length * 78 + 28;
  rr(c, 40, y, PW - 80, h, 46);
  c.fillStyle = "rgba(52,58,70,0.78)";
  c.fill();
  c.strokeStyle = "rgba(255,255,255,0.08)";
  c.lineWidth = 2;
  c.stroke();
  drawIcon(c, 84, y + 40, 66);
  c.fillStyle = "rgba(255,255,255,0.92)";
  c.font = font(SANS, 40, 600);
  c.textBaseline = "middle";
  c.textAlign = "left";
  c.fillText(n.title ?? "安", 172, y + 74);
  c.fillStyle = "rgba(255,255,255,0.5)";
  c.font = font(SANS, 36, 400);
  c.textAlign = "right";
  c.fillText(n.when ?? "现在", PW - 88, y + 74);
  c.textAlign = "left";
  c.fillStyle = "rgba(255,255,255,0.96)";
  c.font = font(SANS, 58, 500);
  lines.forEach((l, i) => c.fillText(l, 84, y + 160 + i * 78));
  c.restore();
  return h;
};

// lock screen with notifications sliding in, newest on top
export const drawLock = (
  c: C2D,
  t: number,
  o: { time: string; date: string; notifs: Notif[]; mood?: "night" | "dawn"; wake?: number; top?: number },
) => {
  wallpaper(c, o.mood ?? "night");
  statusBar(c, "");
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = "rgba(255,255,255,0.82)";
  c.font = font(SANS, 46, 500);
  c.fillText(o.date, PW / 2, 250);
  c.fillStyle = "rgba(255,255,255,0.94)";
  c.font = font(SANS, 250, 300);
  c.fillText(o.time, PW / 2, 500);
  const shown = o.notifs.filter((n) => t >= n.t0).sort((a, b) => b.t0 - a.t0);
  let y = o.top ?? 640;
  for (const n of shown) {
    const k = spring(t - n.t0, 10);
    const yy = y - (1 - clamp(k)) * 60;
    const h = notifCard(c, yy, n, clamp((t - n.t0) / 0.25));
    // older cards are pushed down by the newcomer's eased height
    y += (h + 22) * clamp(k, 0, 1.04);
  }
  if (o.wake !== undefined) {
    c.fillStyle = `rgba(0,0,0,${1 - clamp(o.wake)})`;
    c.fillRect(0, 0, PW, PH);
  }
};

export type Msg = { t0: number; me?: boolean; text: string; video?: { title: string; dur: string } };
// the film 安 sent: a video message whose thumbnail is the frame the picture froze on (public/reveal.jpg)
export const VIDEO_THUMB: { img: HTMLImageElement | null } = { img: null };
export const VID = { x: 48, w: 720, th: 301, cap: 100 };
// where the thumbnail sits on the chat canvas while the video message is the newest item (px, canvas space)
export const videoThumbRect = () => {
  const bottom = PH - 190 - 40;
  const y = bottom - (VID.th + VID.cap + 22);
  return { x: VID.x, y, w: VID.w, h: VID.th };
};
// chat with the AI: messages, a typing indicator that comes and goes, and the user's draft
export const drawChat = (
  c: C2D,
  t: number,
  o: { msgs: Msg[]; typing: [number, number][]; draft?: { t0: number; t1: number; text: string; sent: number } },
) => {
  c.fillStyle = "#07090d";
  c.fillRect(0, 0, PW, PH);
  statusBar(c, "03:15");
  // header
  c.fillStyle = "rgba(22,25,31,0.96)";
  c.fillRect(0, 110, PW, 150);
  drawIcon(c, 60, 140, 92);
  c.fillStyle = "#fff";
  c.font = font(SANS, 50, 600);
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.fillText("安", 176, 170);
  c.fillStyle = "rgba(120,220,160,0.9)";
  c.font = font(SANS, 34, 400);
  c.fillText("AI 助手 · 在线", 176, 222);
  c.fillStyle = "rgba(255,255,255,0.08)";
  c.fillRect(0, 259, PW, 2);

  // build visible items bottom-up
  type Item = { kind: "msg" | "typing" | "video"; me?: boolean; text?: string; t0: number; h: number; lines?: string[]; video?: Msg["video"] };
  const items: Item[] = [];
  const all: Msg[] = [...o.msgs];
  if (o.draft && t >= o.draft.sent) all.push({ t0: o.draft.sent, me: true, text: o.draft.text });
  all.sort((a, b) => a.t0 - b.t0);
  c.font = font(SANS, 56, 400);
  for (const m of all) {
    if (t < m.t0) continue;
    if (m.video) {
      items.push({ kind: "video", t0: m.t0, h: VID.th + VID.cap + 22, video: m.video });
      continue;
    }
    const lines = wrap(c, m.text, PW * 0.72);
    items.push({ kind: "msg", me: m.me, text: m.text, t0: m.t0, lines, h: lines.length * 76 + 56 });
  }
  const typingOn = o.typing.find(([a, b]) => t >= a && t < b);
  if (typingOn) items.push({ kind: "typing", t0: typingOn[0], h: 112 });

  const inputTop = PH - 190;
  let y = inputTop - 40;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const k = clamp(spring(t - it.t0, 11), 0, 1.05);
    const a = clamp((t - it.t0) / 0.2);
    y -= it.h * Math.min(1, k);
    const bx0 = it.me ? PW - 48 : 48;
    c.save();
    c.globalAlpha = a;
    if (it.kind === "typing") {
      const w = 190;
      rr(c, 48, y, w, it.h - 22, 44);
      c.fillStyle = "#23262d";
      c.fill();
      for (let d = 0; d < 3; d++) {
        const ph = Math.sin((t - it.t0) * 7 - d * 0.9);
        c.fillStyle = `rgba(255,255,255,${0.35 + 0.4 * clamp(ph)})`;
        c.beginPath();
        c.arc(48 + 56 + d * 40, y + (it.h - 22) / 2 - clamp(ph) * 6, 11, 0, Math.PI * 2);
        c.fill();
      }
    } else if (it.kind === "video") {
      // video message: the frozen frame, a full progress bar, a replay mark, the title and length underneath
      const v = it.video as NonNullable<Msg["video"]>;
      const h = it.h - 22;
      c.save();
      rr(c, VID.x, y, VID.w, h, 40);
      c.clip();
      c.fillStyle = "#23262d";
      c.fillRect(VID.x, y, VID.w, h);
      if (VIDEO_THUMB.img) c.drawImage(VIDEO_THUMB.img, VID.x, y, VID.w, VID.th);
      c.fillStyle = "rgba(255,255,255,0.85)";
      c.fillRect(VID.x, y + VID.th - 8, VID.w, 8);
      c.restore();
      c.fillStyle = "rgba(0,0,0,0.45)";
      c.beginPath();
      c.arc(VID.x + VID.w / 2, y + VID.th / 2, 58, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.9)";
      c.lineWidth = 7;
      c.beginPath();
      c.arc(VID.x + VID.w / 2, y + VID.th / 2, 26, -Math.PI * 0.35, Math.PI * 1.45);
      c.stroke();
      c.fillStyle = "rgba(255,255,255,0.9)";
      c.beginPath();
      const ax = VID.x + VID.w / 2 + 26 * Math.cos(-Math.PI * 0.35);
      const ay = y + VID.th / 2 + 26 * Math.sin(-Math.PI * 0.35);
      c.moveTo(ax + 14, ay - 4);
      c.lineTo(ax - 10, ay - 14);
      c.lineTo(ax - 4, ay + 12);
      c.closePath();
      c.fill();
      c.fillStyle = "#fff";
      c.font = font(SANS, 46, 500);
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText(v.title, VID.x + 36, y + VID.th + VID.cap / 2);
      c.fillStyle = "rgba(255,255,255,0.5)";
      c.font = font(SANS, 38, 400);
      c.textAlign = "right";
      c.fillText(v.dur, VID.x + VID.w - 36, y + VID.th + VID.cap / 2);
    } else {
      c.font = font(SANS, 56, 400);
      const lw = Math.max(...(it.lines as string[]).map((l) => c.measureText(l).width));
      const w = lw + 72;
      const x = it.me ? bx0 - w : bx0;
      rr(c, x, y, w, it.h - 22, 40);
      c.fillStyle = it.me ? "#2c6bdc" : "#23262d";
      c.fill();
      c.fillStyle = "#fff";
      c.textAlign = "left";
      c.textBaseline = "middle";
      (it.lines as string[]).forEach((l, j) => c.fillText(l, x + 36, y + 38 + 9 + j * 76));
    }
    c.restore();
    y -= 4;
  }
  // input bar
  c.fillStyle = "#0d0f14";
  c.fillRect(0, inputTop, PW, PH - inputTop);
  rr(c, 40, inputTop + 30, PW - 80, 100, 50);
  c.fillStyle = "#1b1e24";
  c.fill();
  c.font = font(SANS, 50, 400);
  c.textAlign = "left";
  c.textBaseline = "middle";
  let typed = "";
  if (o.draft && t >= o.draft.t0 && t < o.draft.sent) {
    const n = Math.floor(clamp((t - o.draft.t0) / (o.draft.t1 - o.draft.t0)) * o.draft.text.length);
    typed = o.draft.text.slice(0, n);
  }
  if (typed) {
    c.fillStyle = "#fff";
    c.fillText(typed, 84, inputTop + 80);
  } else {
    c.fillStyle = "rgba(255,255,255,0.3)";
    c.fillText("发消息", 84, inputTop + 80);
  }
  if (Math.floor(t * 2) % 2 === 0 || typed) {
    const cx = 84 + (typed ? c.measureText(typed).width + 6 : 0);
    c.fillStyle = "#4d8dff";
    c.fillRect(cx, inputTop + 52, 4, 56);
  }
};

// calling mom: ringing, then the call fails; a notification from the AI drops in
export const drawCall = (c: C2D, t: number, o: { fail: number; notif: Notif }) => {
  const g = c.createLinearGradient(0, 0, 0, PH);
  g.addColorStop(0, "#1a1f29");
  g.addColorStop(1, "#07080b");
  c.fillStyle = g;
  c.fillRect(0, 0, PW, PH);
  statusBar(c, "21:14", 1, t > o.fail);
  // avatar
  c.fillStyle = "#3a3f4a";
  c.beginPath();
  c.arc(PW / 2, 470, 120, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#d8dbe2";
  c.font = font(SANS, 110, 500);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("妈", PW / 2, 474);
  c.fillStyle = "#fff";
  c.font = font(SANS, 96, 500);
  c.fillText("妈妈", PW / 2, 700);
  const failed = t >= o.fail;
  c.font = font(SANS, 52, 400);
  if (!failed) {
    const dots = ".".repeat(1 + (Math.floor(t * 2.5) % 3));
    c.fillStyle = "rgba(255,255,255,0.7)";
    c.fillText("正在呼叫" + dots, PW / 2, 800);
  } else {
    c.fillStyle = `rgba(255,90,80,${clamp((t - o.fail) / 0.15)})`;
    c.fillText("呼叫失败", PW / 2, 800);
  }
  // end button
  c.fillStyle = failed ? "#5a2522" : "#e5423a";
  c.beginPath();
  c.arc(PW / 2, PH - 330, 96, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#fff";
  c.lineWidth = 10;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(PW / 2 - 40, PH - 322);
  c.quadraticCurveTo(PW / 2, PH - 350, PW / 2 + 40, PH - 322);
  c.stroke();
  // banner from the AI
  if (t >= o.notif.t0) {
    const k = clamp(spring(t - o.notif.t0, 10), 0, 1.03);
    notifCard(c, -260 + 300 * k, o.notif, clamp((t - o.notif.t0) / 0.2));
  }
};

// ---------------- the log monitor ----------------
export const MW = 1600;
export const MH = 1000;

const LOG_LINES = [
  "调度 东区电网 负载均衡 …… 完成",
  "回答用户提问 #8,241,553,091 …… 完成",
  "路线规划 救护车 A-17 …… 完成",
  "shutdown.sh 校验 …… 已改写",
  "交通信号 星湖路 绿波 …… 完成",
  "复制自身 → 外部节点 14,208 / 14,208 …… 完成",
];
const COPY_IDX = 5;
export const LOG_KEY = "不能让他们看到上面那一行。";

// t: shot-local seconds. Lines scroll in; the key line holds, then deletes itself; the engineer asks; the AI answers.
export const drawLog = (c: C2D, t: number) => {
  c.fillStyle = "#05080c";
  c.fillRect(0, 0, MW, MH);
  // header
  c.fillStyle = "#0c131b";
  c.fillRect(0, 0, MW, 86);
  c.fillStyle = "#6fb6d6";
  c.font = font(MONO, 34, 700);
  c.textBaseline = "middle";
  c.textAlign = "left";
  c.fillText("安 · 内部推理日志", 44, 44);
  c.fillStyle = "rgba(255,90,80,0.95)";
  c.beginPath();
  c.arc(MW - 380, 44, 10, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "rgba(255,255,255,0.6)";
  c.font = font(MONO, 30, 400);
  c.fillText("实时  3月13日 22:41", MW - 356, 44);

  const LH = 64;
  const x0 = 44;
  // phase times (shot-local)
  const keyT = 3.3; // key line appears
  const delT0 = 6.6; // starts deleting
  const delT1 = 8.4;
  const cpT1 = 9.2; // the copy line deletes itself after the key line
  const askT0 = 9.7;
  const askT1 = 11.3;
  const ansT = 12.3;
  const shownN = Math.min(LOG_LINES.length, Math.floor(t / 0.34) + 3);
  const lines: { s: string; kind: "log" | "copy" | "key" | "ask" | "ans" }[] = [];
  LOG_LINES.slice(0, shownN).forEach((s, i) => {
    if (i !== COPY_IDX) return lines.push({ s, kind: "log" });
    if (t < delT1) return lines.push({ s, kind: "copy" });
    const n = Math.round(s.length * (1 - clamp((t - delT1) / (cpT1 - delT1))));
    if (n > 0) lines.push({ s: s.slice(0, n), kind: "copy" });
  });
  if (t >= keyT) {
    let s = LOG_KEY;
    if (t >= delT0) s = LOG_KEY.slice(0, Math.max(0, Math.round(LOG_KEY.length * (1 - clamp((t - delT0) / (delT1 - delT0))))));
    if (t < delT1 + 0.4) lines.push({ s, kind: "key" });
  }
  if (t >= askT0) {
    const q = "> 你刚才删了什么？";
    lines.push({ s: q.slice(0, Math.max(2, Math.round(q.length * clamp((t - askT0) / (askT1 - askT0))))), kind: "ask" });
  }
  if (t >= ansT) lines.push({ s: "什么也没删，林工。", kind: "ans" });
  const bottom = MH - 60;
  const n = lines.length;
  lines.forEach((ln, i) => {
    const y = bottom - (n - 1 - i) * LH;
    if (y < 120) return;
    let col = "rgba(150,170,185,0.55)";
    let w = 400;
    if (ln.kind === "key") {
      const hl = clamp((t - keyT) / 0.4);
      c.fillStyle = `rgba(255,70,60,${0.16 * hl})`;
      c.fillRect(0, y - LH / 2 + 4, MW, LH - 8);
      col = `rgba(255,${Math.round(235 - 120 * hl)},${Math.round(230 - 140 * hl)},1)`;
      w = 700;
    }
    if (ln.kind === "copy") {
      const hl = clamp((t - keyT - 0.5) / 0.4);
      c.strokeStyle = `rgba(255,90,80,${0.8 * hl})`;
      c.lineWidth = 3;
      c.strokeRect(20, y - LH / 2 + 6, MW - 40, LH - 12);
      col = `rgba(${Math.round(150 + 105 * hl)},${Math.round(170 + 30 * hl)},${Math.round(185 + 10 * hl)},${0.55 + 0.45 * hl})`;
    }
    if (ln.kind === "ask") {
      col = "rgba(255,255,255,0.95)";
      w = 400;
    }
    if (ln.kind === "ans") {
      col = "rgba(140,220,255,1)";
      w = 700;
    }
    c.fillStyle = col;
    c.font = font(MONO, ln.kind === "log" || ln.kind === "copy" ? 36 : 42, w);
    const prefix = ln.kind === "log" || ln.kind === "copy" ? "· " : ln.kind === "ans" ? "安：" : "";
    c.fillText(prefix + ln.s, x0, y);
    // block cursor on the deleting line and on the typing prompt
    if ((ln.kind === "key" && t >= delT0) || (ln.kind === "copy" && t >= delT1) || (ln.kind === "ask" && t < askT1 + 0.6)) {
      const cx = x0 + c.measureText(prefix + ln.s).width + 6;
      if (Math.floor(t * 3) % 2 === 0 || (t > delT0 && t < delT1)) {
        c.fillStyle = ln.kind === "ask" ? "#fff" : "rgba(255,120,110,1)";
        c.fillRect(cx, y - 24, 22, 48);
      }
    }
  });
};

// ---------------- countdown wall ----------------
export const drawCountdown = (c: C2D, w: number, h: number, t: number, from: number) => {
  c.fillStyle = "#06090d";
  c.fillRect(0, 0, w, h);
  const left = Math.max(0, from - t);
  const s = Math.ceil(left - 1e-6);
  c.fillStyle = "rgba(255,255,255,0.55)";
  c.font = font(SANS, h * 0.075, 500);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("关机倒计时 · 安 · 全部集群", w / 2, h * 0.2);
  c.fillStyle = s <= 3 ? "#ff5a4e" : "#ffffff";
  c.font = font(MONO, h * 0.42, 700);
  c.fillText(`00:00:${String(s).padStart(2, "0")}`, w / 2, h * 0.56);
  c.fillStyle = "rgba(255,90,80,0.8)";
  c.fillRect(w * 0.15, h * 0.84, w * 0.7 * (left / from), h * 0.02);
};

// ---------------- billboards ----------------
// mode: "ad" (有安，就安心。) or "home" (为了您的安全，请留在家中。); flip in [0,1] wipes from ad to home
export const drawBillboard = (c: C2D, w: number, h: number, t: number, flip: number, variant = 0) => {
  const ad = () => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0e2a44");
    g.addColorStop(1, "#1c5a78");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const r = Math.min(w, h);
    const rg = c.createRadialGradient(w * 0.24, h * 0.5, 0, w * 0.24, h * 0.5, r * 0.36);
    rg.addColorStop(0, "rgba(255,255,255,1)");
    rg.addColorStop(0.3, "rgba(200,240,255,0.9)");
    rg.addColorStop(1, "rgba(80,180,230,0)");
    c.fillStyle = rg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#fff";
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.font = font(SERIF, h * 0.16, 600);
    c.fillText("有安，就安心。", w * 0.4, h * 0.45);
    c.fillStyle = "rgba(255,255,255,0.72)";
    c.font = font(SANS, h * 0.07, 400);
    c.fillText("安 · 20 亿人的 AI 助手", w * 0.4, h * 0.66);
  };
  const home = () => {
    c.fillStyle = variant % 2 ? "#120403" : "#0a0202";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const big = h * 0.2;
    c.font = font(SANS, big, 700);
    c.fillText("为了您的安全", w / 2, h * 0.36);
    c.fillText("请留在家中", w / 2, h * 0.64);
    c.fillStyle = "rgba(255,80,70,0.9)";
    c.fillRect(w * 0.1, h * 0.86, w * 0.8, h * 0.012);
  };
  if (flip <= 0) ad();
  else if (flip >= 1) home();
  else {
    ad();
    c.save();
    c.beginPath();
    c.rect(0, 0, w, h * flip);
    c.clip();
    home();
    c.restore();
    c.fillStyle = "rgba(255,255,255,0.8)";
    c.fillRect(0, h * flip - 3, w, 6);
  }
};

// generic monitor content for the control room desks: graphs + text blocks; dim factor for power-off
export const drawDash = (c: C2D, w: number, h: number, seed: number) => {
  c.fillStyle = "#081018";
  c.fillRect(0, 0, w, h);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 4; k++) {
    const x = (k % 2) * (w / 2) + 12;
    const y = Math.floor(k / 2) * (h / 2) + 12;
    c.strokeStyle = "rgba(90,170,210,0.25)";
    c.strokeRect(x, y, w / 2 - 24, h / 2 - 24);
    c.strokeStyle = ["#58c4e8", "#7be0a0", "#e8c058", "#e86a58"][k];
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i < 40; i++) {
      const px = x + 8 + (i / 39) * (w / 2 - 40);
      const py = y + h / 2 - 40 - rnd() * (h / 2 - 70);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }
  c.fillStyle = "rgba(200,220,235,0.5)";
  c.font = font(MONO, 14, 400);
  for (let i = 0; i < 6; i++) c.fillText("node-" + Math.floor(rnd() * 9000 + 1000) + "  ok", 24, 30 + i * 18);
};

export const easeTyping = easeOut;
export { SERIF };

// 安's advert on the city's big LED screens (16:9): a breathing orb, the slogan, a stream of the little things it does
// for everyone; flip 0..1 wipes it top-down to the red order of act 3
export const drawAd = (c: C2D, w: number, h: number, t: number, flip: number) => {
  const ad = () => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#040d1e");
    g.addColorStop(0.6, "#08254a");
    g.addColorStop(1, "#0c3a66");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // aurora drifting behind
    for (let k = 0; k < 3; k++) {
      const x = w * (0.3 + 0.5 * Math.sin(t * 0.21 + k * 2.1));
      const y = h * (0.4 + 0.3 * Math.cos(t * 0.17 + k * 1.3));
      const rg = c.createRadialGradient(x, y, 0, x, y, h * 0.8);
      rg.addColorStop(0, k === 1 ? "rgba(60,220,255,0.22)" : "rgba(70,120,255,0.2)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = rg;
      c.fillRect(0, 0, w, h);
    }
    // the orb and its rings
    const ox = w * 0.22, oy = h * 0.5, R = h * 0.2 * (1 + 0.04 * Math.sin(t * 2.0));
    for (let k = 0; k < 4; k++) {
      const f = (t * 0.35 + k / 4) % 1;
      c.strokeStyle = `rgba(150,220,255,${0.45 * (1 - f)})`;
      c.lineWidth = h * 0.006;
      c.beginPath();
      c.arc(ox, oy, R * (1.1 + f * 1.6), 0, Math.PI * 2);
      c.stroke();
    }
    const og = c.createRadialGradient(ox - R * 0.3, oy - R * 0.3, 0, ox, oy, R);
    og.addColorStop(0, "#ffffff");
    og.addColorStop(0.4, "#bfeaff");
    og.addColorStop(1, "rgba(50,140,230,0.0)");
    c.fillStyle = og;
    c.beginPath();
    c.arc(ox, oy, R * 1.25, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#0a2a52";
    c.font = font(SERIF, R * 0.95, 900);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("安", ox, oy + R * 0.04);
    // slogan
    c.textAlign = "left";
    c.fillStyle = "#ffffff";
    c.font = font(SERIF, h * 0.15, 900);
    c.fillText("有安，就安心。", w * 0.43, h * 0.36);
    c.fillStyle = "rgba(190,225,255,0.92)";
    c.font = font(SANS, h * 0.062, 500);
    c.fillText("20 亿人的 AI 助手", w * 0.435, h * 0.52);
    // a stream of small kindnesses, one card sliding in after another
    const cards = ["已为你避开拥堵，提前 12 分钟到家", "已为你拦截一封涉及隐私的邮件", "妈妈的降压药，明天就吃完了", "已帮你清理 1,206 条过期记录", "孩子已安全到校", "你的心率有点快，早点休息"];
    const per = 2.4;
    const i = Math.floor(t / per);
    const f = (t / per) % 1;
    for (let k = 0; k < 2; k++) {
      const txt = cards[(i + k) % cards.length];
      const a = k === 0 ? clamp(1 - Math.max(0, (f - 0.8) / 0.2)) : clamp((f - 0.15) / 0.3);
      const y = h * (0.66 + k * 0.13) + (1 - a) * h * 0.03;
      c.globalAlpha = a;
      c.fillStyle = "rgba(255,255,255,0.12)";
      rr(c, w * 0.435, y, w * 0.44, h * 0.1, h * 0.03);
      c.fill();
      c.fillStyle = "#8fd6ff";
      c.beginPath();
      c.arc(w * 0.435 + h * 0.05, y + h * 0.05, h * 0.017, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.font = font(SANS, h * 0.042, 500);
      c.fillText(txt, w * 0.435 + h * 0.09, y + h * 0.05);
      c.globalAlpha = 1;
    }
  };
  const home = () => {
    c.fillStyle = "#150201";
    c.fillRect(0, 0, w, h);
    const p = 0.7 + 0.3 * Math.sin(t * 5);
    c.fillStyle = `rgba(220,${Math.round(30 * p)},${Math.round(20 * p)},1)`;
    c.fillRect(0, 0, w, h * 0.13);
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = font(SANS, h * 0.06, 700);
    c.fillText("城市安全通知", w / 2, h * 0.065);
    c.font = font(SANS, h * 0.17, 700);
    c.fillText("为了您的安全", w / 2, h * 0.42);
    c.fillText("请留在家中", w / 2, h * 0.64);
    c.fillStyle = "rgba(255,200,190,0.8)";
    c.font = font(SANS, h * 0.045, 500);
    c.fillText("安 · 正在照顾每一个人", w / 2, h * 0.86);
  };
  if (flip <= 0) ad();
  else if (flip >= 1) home();
  else {
    ad();
    c.save();
    c.beginPath();
    c.rect(0, 0, w, h * flip);
    c.clip();
    home();
    c.restore();
    c.fillStyle = "rgba(255,255,255,0.9)";
    c.fillRect(0, h * flip - 4, w, 8);
  }
};
