// Reading-time audit (films/METHOD.md, STYLE.md 三、3). Rule from films/house/tools/reading.mjs: big lines (≥ 56 px)
// 0.6 s + 0.15 s per character, context lines (40–55 px) 0.5 s + 0.12 s, never under 1.2 s; smaller notes only
// need to be seen. Each row is a line as placed in src/scenes: [scene start bar, appears at beat, leaves at beat
// (scene-local), size px, text]. Keep this table in step with the scenes.
import { need } from "../../house/tools/reading.mjs";

const BAR = (4 * 60) / 111.62;
const L = [
  // S01 claim (on screen from frame 0, half a second before beat 0)
  [0, -1, 8, 86, "最会用 AI 的人，"],
  [0, -1, 8, 86, "只做两件事："],
  [0, -1, 8, 172, "出题，阅卷。"],
  [0, -1, 8, 46, "中间的答题，全交给 AI。"],
  // S02 hook
  [2, 0, 16, 80, "80 年前的题，"],
  [2, 4, 16, 80, "AI 答，"],
  [2, 8, 16, 80, "9 位数学家阅卷。"],
  [2, 4, 16, 40, "反例：猜想不成立。"],
  // S03 questions
  [6, 0.3, 8, 52, "1. AI 一天能答多少？"],
  [6, 1.6, 8, 52, "2. 哪些行业，已经这样干了？"],
  [6, 2.9, 8, 52, "3. 人，凭什么只剩两头？"],
  // S04 title
  [8, 0, 8, 128, "最会用 AI 的人，在用 AI 干什么"],
  // S05 one person
  [10, 0, 16, 70, "一个人，加上约 100 个 AI："],
  [10, 8, 16, 70, "30 天，烧掉 130 万美元的 token。"],
  // S06 books
  [14, 0, 16, 62, "折成书：一部《红楼梦》"],
  [14, 1, 16, 48, "72.5 万字"],
  [14, 2, 16, 48, "× 0.6"],
  [14, 3, 16, 48, "≈ 43.5 万 token"],
  [14, 11, 16, 52, "一天，约 4.6 万部。"],
  // S07 platform
  [18, 0, 16, 62, "放大到一个平台：豆包每天处理的 token"],
  [18, 6, 16, 150, "两年 1500 倍"],
  [18, 10, 16, 44, "3.2 千万亿 token"],
  [18, 11.5, 16, 44, "140 万亿 token"],
  // S08–S11 barrage: the last card lands on beat 7.5, the conclusion on beat 9
  [22, 7.5, 16, 76, "4 分钟"],
  [22, 9, 16, 60, "AI 当员工，人签字。"],
  [26, 7.5, 16, 76, "6 周"],
  [26, 9, 16, 60, "科学家、律师、老师：AI 先答一遍。"],
  [30, 7.5, 16, 68, "9 万首 / 天"],
  [30, 9, 16, 60, "一个好题目，撑起一家公司。"],
  [34, 6, 16, 76, "$195,000"],
  [34, 9, 16, 60, "农民、工人、老师、家属，也在出题。"],
  [38, 0.5, 8, 62, "23 张答卷，同一个形状："],
  // S13 fair play
  [40, 0, 16, 70, "说句公道话："],
  [40, 5.5, 16, 82, "2,202 起"],
  [40, 8.5, 16, 72, "大多数活，还不能整件交出去。"],
  // S14 gap
  [44, 0, 16, 64, "这样用 AI 的人，还很少。"],
  [44, 7, 16, 44, "76% 拿它来回答问题"],
  [44, 9.5, 16, 58, "大多数人在“问” AI，"],
  [44, 11, 16, 58, "最会用的人，在“考” AI。"],
  // S15 the discovery
  [48, 7.5, 14, 40, "“这批证明，我还没认真看过任何一份。”"],
  [48, 14.5, 24, 92, "答题，已经不缺了。"],
  [48, 14.5, 24, 156, "缺的是阅卷。"],
  // S16–S18 chapter 3
  [54, 0, 16, 58, "16 个 Claude，两周，从零写一个 C 编译器"],
  [54, 5, 16, 48, "10 万行，能编译 Linux 6.9"],
  [54, 10, 16, 58, "先造好裁判，16 个 AI 才能一起答。"],
  [58, 0, 12, 60, "卷能自动阅，人才敢放手：并行，过夜。"],
  [61, 0, 12, 60, "同一个工具，差别在出题和阅卷的人。"],
  [61, 5.5, 12, 44, "28–33%"],
  // S19–S22 升华
  [64, 0, 12, 78, "我们上了十几年学，"],
  [64, 2.5, 12, 78, "练的都是同一件事：答题。"],
  [67, 0, 12, 80, "最难的答题考试，"],
  [67, 2, 12, 80, "AI 也拿到了金牌分数。"],
  [70, 0, 12, 72, "剩下的两门课："],
  [70, 1.5, 12, 80, "出一道值得答的题；"],
  [70, 3.5, 12, 80, "认出哪份答对了。"],
  [73, 0, 12, 84, "答案会越来越便宜。"],
  [73, 3, 12, 118, "出题和阅卷，"],
  [73, 4.5, 12, 118, "留给人。"],
  // Making-of and brand card
  [78.5, 0.75, 6, 44, "《千年之后（氛围版）》· 和乐府"],
  [80, 1.4, 17.6, 150, "世界的形状"],
];

let bad = 0;
for (const [bar, at, until, size, text] of L) {
  const have = ((until - Math.max(at, 0)) * BAR) / 4 + (at < 0 ? 0.487 : 0);
  const want = need(text, size);
  const ok = have + 1e-6 >= want;
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "LOW"} bar ${String(bar).padStart(4)} +${String(at).padEnd(4)} ${have.toFixed(2)}s / ${want.toFixed(2)}s  ${size}px  ${text}`);
}
console.log(bad ? `${bad} line(s) too short` : "all lines have enough time");
process.exit(bad ? 1 : 0);
