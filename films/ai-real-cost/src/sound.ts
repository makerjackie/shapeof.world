import { CAPTIONS } from "./captions";
import { ANSWER_AT, SAND_AT } from "./scenes/coda";
import { C_DONE, C_ROW_AT, D_DONE, D_ROW_AT, EXAM_START, F_ROW_AT, F_STUCK_AT } from "./scenes/exam";
import { HOOK_END, PRICE_STEPS } from "./scenes/hook";
import { COIN_AT, COINS, DROP_AT, DROP_LEN, PLAN_END, passTime } from "./scenes/plan";
import {
  BILL_AT,
  BUILD_AT,
  CLOCK_IN,
  COIN_IN,
  COIN_DROP,
  HARD,
  HARD_AT,
  HOURS_AT,
  LAMP_ON,
  LOOP_AT,
  MACH_AT,
  PH,
  PLUS54_AT,
  PRICE_AT,
  ROUND_AT,
  ROUNDS_C,
  ROUNDS_D,
  ROW_AT,
  SAVE_AT,
  SHARE_AT,
  WALL_AT,
} from "./scenes/time";
import { BEAT, FB } from "./timing";

// One-shot sounds: [film seconds, file under public/lib, volume]. Material follows the object (paper is paper, coins
// are metal, the clock is a click); pitched effects come from public/lib/tuned (tools/tune_sfx.py). The end card has
// no sound of its own: the track's fade carries it.
export type Ev = [number, string, number];
const T = (f: string) => `tuned/${f}`;

const ev: Ev[] = [];
const add = (s: number, f: string, v: number) => ev.push([s, f, v]);

// ── captions: card slide as the strip enters, a tap on the first character ──
for (const c of CAPTIONS) {
  add(c.at - 0.18, "sfx-foley-02.wav", 0.3);
  add(c.at, "sfx-ui-01.wav", 0.38);
}

// ── 1. hook ──
add(0.0, "sfx-impact-08.wav", 0.55);
add(0.02, "sfx-foley-01.wav", 0.5);
add(0.06, T("sfx-impact-06.wav"), 0.35);
PRICE_STEPS.slice(1, 4).forEach(([s], i) => {
  add(s - 0.1, "sfx-mechanical-13.wav", 0.8);
  add(s, T("sfx-impact-03.wav"), 0.22 + i * 0.06);
});
add(FB(1), "sfx-impact-08.wav", 1.0);
add(FB(1), T("sfx-impact-06.wav"), 0.55);
add(FB(1) + 0.02, T("sfx-impact-11.wav"), 0.3);
add(FB(1.25), "sfx-impact-08.wav", 0.6);
add(FB(1.25), "sfx-mechanical-01.wav", 0.5);
add(FB(2.5), "sfx-foley-02.wav", 0.3);
add(FB(3), T("sfx-game-01.wav"), 0.3);

// ── 2. title receipt ──
add(HOOK_END - 0.32, "sfx-transition-02.wav", 0.45);
add(HOOK_END - 0.2, "sfx-foley-08.wav", 0.7);
add(HOOK_END + 0.15, "sfx-foley-08.wav", 0.45);
add(HOOK_END, T("sfx-impact-06.wav"), 0.6);
add(HOOK_END, "sfx-impact-01.wav", 0.5);
add(FB(5), T("sfx-impact-05.wav"), 0.22);

// ── 3. subscription: card, then coins ──
add(FB(6) - 0.25, "sfx-transition-02.wav", 0.45);
add(FB(6), "sfx-foley-02.wav", 0.35);
add(FB(8), "sfx-mechanical-01.wav", 0.45);
add(FB(8) + 0.3, T("sfx-impact-03.wav"), 0.45);
for (let i = 0; i < COINS; i++) {
  add(COIN_AT(i), T("sfx-impact-03.wav"), 0.42 - 0.26 * (i / COINS));
  if ((i + 1) % 12 === 0) add(COIN_AT(i), T("sfx-impact-06.wav"), 0.25);
}
add(FB(10.5), "sfx-impact-08.wav", 0.9);
add(FB(10.5), T("sfx-impact-06.wav"), 0.5);
add(FB(10.5) + 0.12, T("sfx-game-01.wav"), 0.28);

// ── 4. price ruler ──
add(PLAN_END - 0.32, "sfx-transition-02.wav", 0.45);
add(DROP_AT, "sfx-transition-18.wav", 0.4);
[67, 27, 8].forEach((v) => {
  add(passTime(v), "sfx-mechanical-13.wav", 0.6);
  add(passTime(v), T("sfx-ui-10.wav"), 0.3);
});
add(DROP_AT + DROP_LEN, "sfx-impact-01.wav", 0.7);
add(DROP_AT + DROP_LEN, T("sfx-impact-05.wav"), 0.42);
add(DROP_AT + DROP_LEN + 0.1, T("sfx-game-01.wav"), 0.25);

// ── 5. exam receipts ──
add(EXAM_START - 0.32, "sfx-transition-02.wav", 0.45);
add(EXAM_START + 0.15, "sfx-mechanical-13.wav", 0.5);
add(EXAM_START + 0.25, "sfx-mechanical-13.wav", 0.4);
for (let i = 0; i < 4; i++) {
  add(C_ROW_AT(i), "sfx-foley-08.wav", 0.4);
  add(C_ROW_AT(i), "sfx-mechanical-13.wav", 0.35);
}
for (let i = 0; i < 33; i++) add(D_ROW_AT(i), "sfx-mechanical-13.wav", 0.34 - 0.14 * (i / 33));
for (let i = 0; i < 14; i++) add(D_ROW_AT(0) + i * 0.42, "sfx-foley-08.wav", 0.16);
add(C_DONE, T("sfx-impact-06.wav"), 0.45);
add(D_DONE, T("sfx-impact-06.wav"), 0.45);
add(D_DONE, "sfx-impact-01.wav", 0.45);
add(FB(18.5), "sfx-impact-08.wav", 0.75);
add(FB(18.5), "sfx-mechanical-01.wav", 0.4);
add(FB(20), "sfx-transition-02.wav", 0.3);
add(FB(20) + 0.6, T("sfx-impact-05.wav"), 0.3);

// ── 6. formula receipt, and the line that jams as the music cuts out ──
add(FB(22) - 0.32, "sfx-transition-02.wav", 0.4);
F_ROW_AT.forEach((s, i) => {
  add(s, "sfx-foley-08.wav", 0.45);
  if (i > 0) add(s + 0.15, T("sfx-impact-06.wav"), 0.3);
});
add(F_STUCK_AT, "sfx-foley-08.wav", 0.45);
add(F_STUCK_AT + 0.3, "sfx-mechanical-01.wav", 0.5);
add(F_STUCK_AT + 1.0, "sfx-foley-08.wav", 0.3);
add(F_STUCK_AT + 1.2, T("sfx-notification-18.wav"), 0.35);
add(FB(27), "sfx-mechanical-01.wav", 0.6);

// ── the clock: ticks on the beat, a J-cut into the chapter; loud in the two silences, soft under the music ──
const ticks = (from: number, to: number, level: (s: number) => number) => {
  for (let s = from, k = 0; s < to - 0.02; s += BEAT, k++) add(s, k % 2 ? T("sfx-ui-10.wav") : "sfx-mechanical-01.wav", (k % 2 ? 0.5 : 1) * level(s));
};
ticks(FB(26), FB(36), (s) => (s >= FB(27) && s < FB(28) ? 0.42 : s < FB(27) ? 0.18 : 0.22));
ticks(FB(52), FB(60), (s) => (s >= FB(59) ? 0.42 : 0.16));
add(LAMP_ON, "sfx-mechanical-02.wav", 0.6);

// ── 7. desk and the ten programmers ──
add(FB(28.75), T("sfx-notification-02.wav"), 0.38);
add(FB(30), T("sfx-notification-18.wav"), 0.32);
add(FB(30), "sfx-impact-01.wav", 0.3);
add(ROW_AT - 0.35, "sfx-transition-02.wav", 0.35);
for (let i = 0; i < 10; i++) if (i !== 6) add(ROW_AT + 0.45 + i * 0.07, "sfx-foley-02.wav", 0.1);
add(ROW_AT + 0.9, T("sfx-game-01.wav"), 0.3);

// ── 8. one task, round by round ──
add(LOOP_AT - 0.35, "sfx-transition-02.wav", 0.4);
const lane = (rounds: { r0: number; ok: boolean }[], pan: number) => {
  for (const r of rounds) {
    add(r.r0, "sfx-foley-02.wav", 0.28 * pan);
    for (let k = 0; k < 3; k++) add(r.r0 + PH.toAI + k * 0.15, "sfx-mechanical-13.wav", 0.18 * pan);
    add(r.r0 + PH.work, "sfx-foley-02.wav", 0.22 * pan);
    for (let k = 0; k < 5; k++) add(r.r0 + PH.back + k * 0.14, "sfx-mechanical-01.wav", 0.2 * pan);
    if (r.ok) add(r.r0 + PH.verdict, T("sfx-impact-05.wav"), 0.42);
    else {
      add(r.r0 + PH.verdict, T("sfx-notification-18.wav"), 0.4);
      add(r.r0 + PH.verdict, "sfx-impact-01.wav", 0.35);
    }
  }
};
lane(ROUNDS_C, 1);
lane(ROUNDS_D, 0.9);

// ── 9. the two walls of 100 ──
add(WALL_AT - 0.35, "sfx-transition-02.wav", 0.4);
ROUND_AT.forEach((s, i) => {
  add(s, "sfx-foley-01.wav", 0.24 - i * 0.02);
  add(s + 0.05, T("sfx-impact-05.wav"), 0.22 - i * 0.02);
  add(s + 0.02, "sfx-mechanical-13.wav", 0.26);
});
add(PLUS54_AT, "sfx-impact-08.wav", 0.6);
add(PLUS54_AT, T("sfx-impact-03.wav"), 0.35);

// ── 10. hours ──
add(HOURS_AT - 0.3, "sfx-transition-02.wav", 0.35);
for (let k = 0; k < 22; k++) add(HOURS_AT + 0.1 + k * 0.075, "sfx-mechanical-01.wav", 0.16);
add(HOURS_AT + 1.9, T("sfx-notification-18.wav"), 0.3);
add(FB(46), T("sfx-impact-06.wav"), 0.3);

// ── 11. the machine's time ──
add(MACH_AT - 0.3, "sfx-transition-02.wav", 0.35);
add(MACH_AT + 0.2, "sfx-mechanical-13.wav", 0.35);
add(MACH_AT + 0.4, "sfx-mechanical-13.wav", 0.3);
add(FB(50), "sfx-foley-02.wav", 0.35);
add(FB(50.5), "sfx-impact-08.wav", 0.5);
add(FB(50.5), "sfx-mechanical-01.wav", 0.35);

// ── 12. the price of an hour, then the printers rise ──
add(PRICE_AT - 0.3, "sfx-transition-02.wav", 0.35);
add(COIN_DROP, "sfx-impact-08.wav", 0.5);
add(COIN_DROP + 0.05, T("sfx-game-01.wav"), 0.45);
add(COIN_DROP + 0.1, T("sfx-impact-03.wav"), 0.4);
add(BUILD_AT, "sfx-transition-02.wav", 0.35);
add(BUILD_AT + 0.5, "sfx-impact-01.wav", 0.45);
add(CLOCK_IN, "sfx-foley-02.wav", 0.35);
add(CLOCK_IN + 0.8, "sfx-mechanical-13.wav", 0.55);
add(CLOCK_IN + 0.8, T("sfx-impact-06.wav"), 0.3);
add(COIN_IN, "sfx-foley-02.wav", 0.3);
add(COIN_IN + 0.8, T("sfx-impact-03.wav"), 0.5);
add(COIN_IN + 0.85, T("sfx-impact-03.wav"), 0.4);
for (let k = 0; k < 5; k++) add(COIN_IN + 1.0 + k * 0.37, "sfx-foley-08.wav", 0.18);

// ── 13. the bill: the most important sound after the second silence ──
add(BILL_AT, "sfx-impact-08.wav", 1.0);
add(BILL_AT, T("sfx-impact-05.wav"), 0.7);
add(BILL_AT + 0.02, "sfx-foley-08.wav", 0.6);
add(BILL_AT + BEAT, "sfx-mechanical-13.wav", 0.5);
for (let k = 0; k < 7; k++) add(BILL_AT + 2 * BEAT + k * 0.37, "sfx-foley-08.wav", 0.32);
add(FB(62), T("sfx-impact-06.wav"), 0.55);
add(FB(62) + 0.12, "sfx-mechanical-13.wav", 0.45);
add(SHARE_AT, "sfx-impact-08.wav", 0.7);
add(SHARE_AT, "sfx-mechanical-01.wav", 0.4);
add(SHARE_AT + 0.2, "sfx-impact-08.wav", 0.55);
add(SAVE_AT, "sfx-impact-08.wav", 0.8);
add(SAVE_AT + 0.05, T("sfx-game-01.wav"), 0.42);
add(SAVE_AT + 0.1, T("sfx-impact-05.wav"), 0.38);

// ── 14. the spread ──
add(HARD_AT - 0.3, "sfx-transition-02.wav", 0.35);
HARD.forEach((r) => {
  add(r.at, "sfx-mechanical-13.wav", 0.45);
  add(r.at + 0.9, T("sfx-impact-06.wav"), 0.3);
});
add(FB(71), "sfx-impact-08.wav", 0.75);
add(FB(71), "sfx-mechanical-01.wav", 0.4);

// ── 15. coda (no sound on the end card) ──
add(ANSWER_AT - 0.1, "sfx-foley-08.wav", 0.35);
add(ANSWER_AT + 0.6, T("sfx-impact-05.wav"), 0.45);
add(SAND_AT - 0.3, "sfx-transition-02.wav", 0.3);

export const EVENTS: Ev[] = ev.sort((a, b) => a[0] - b[0]);
