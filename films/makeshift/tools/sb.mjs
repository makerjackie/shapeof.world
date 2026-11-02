// Prints frame numbers for story bars: node tools/sb.mjs 18 19.5 21 …
const BAR = 240 / 111.62, FIRST = 0.487;
const cut = (sb) => (sb >= 25 ? 4 : sb > 21 ? sb - 21 : 0);
const S = (sb) => FIRST + (sb - cut(sb)) * BAR + (sb >= 40 ? BAR : 0);
console.log(process.argv.slice(2).map((x) => Math.round(S(Number(x)) * 30)).join(" "));
