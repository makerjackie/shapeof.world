import type { Cap } from "./kit";
import { FB } from "./timing";

// Every narrative line in the film, in order, in film bars (one bar = 2.150 s). The first character lands on the
// downbeat; `end` is when the strip leaves. tools/audit.mjs checks reading time and the beat.
const c = (bar: number, endBar: number, text: string, kw?: string, kwBar?: number, y?: number): Cap => ({
  at: FB(bar),
  end: FB(endBar) - 0.1,
  text,
  kw,
  kwAt: kwBar === undefined ? undefined : FB(kwBar),
  y,
});

export const CAPTIONS: Cap[] = [
  // hook and the first two layers of the bill
  c(2, 4, "最聪明的 AI，真的最贵吗？", "最贵", 3),
  c(6, 8, "但很多人，是包月用的。", "包月", 7),
  c(8, 10, "按原价算，值多少钱？"),
  c(10, 12, "付 1 份钱，用掉 36 份。", "36 份", 11),
  c(12, 14, "平摊下来，才 ¥3.7。", "¥3.7", 13),
  c(14, 18, "同一套考题，各打一张小票。"),
  c(18, 20, "单价更贵，总价反而更低。", "总价反而更低", 19),
  c(20, 22, "它少绕路，用量只要 1/8。", "1/8", 21),
  c(22, 26, "所以，AI 的真实价格 ="),
  c(26, 28, "可小票上，还漏了最贵的一行。", "最贵的一行", 27),
  // your time
  c(28, 30, "AI 写的代码，你敢直接用吗？"),
  c(30, 32, "最烦的是：差一点就对。", "差一点就对", 31),
  c(32, 34, "10 个人里，只有 1 个敢。", "只有 1 个", 33),
  c(34, 36, "剩下 9 个，都要先查一遍。"),
  c(36, 38, "查一次，花你 5 分钟。", "5 分钟", 37),
  c(38, 40, "没做对，就得再来一轮。", "再来一轮", 39),
  c(40, 42, "一次就做对：62 对 46。"),
  c(42, 44, "便宜的，要你多查 54 次。", "多查 54 次", 43),
  c(44, 46, "你要多盯 4.5 个小时。", "4.5 个小时", 45),
  c(46, 48, "比半个工作日还多。"),
  c(48, 50, "可聪明的那个，干活更慢。"),
  c(50, 52, "那是它的时间，不是你的。", "不是你的", 51),
  c(52, 54, "你的 1 小时，值多少钱？"),
  c(54, 56, "程序员的 1 小时，约 ¥119。"),
  c(56, 60, "把你的时间，也记进账单。", "你的时间", 57),
  c(62, 64, "光看 token，DeepSeek 更省。"),
  c(64, 66, "可最贵的一行，是你的时间。", "你的时间", 65),
  c(66, 68, "算上时间，聪明的反而省。", "聪明的反而省", 67),
  c(68, 70, "这还只是平均。"),
  c(70, 72, "让 AI 自己动手的活，差一倍。", "差一倍", 71),
  // coda
  c(74, 77.5, "token 会越来越多，", undefined, undefined, 150),
  c(75.5, 77.5, "唯一不会变多的，是你的时间。", "你的时间", 76.5, 290),
];
