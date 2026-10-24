// Subscription values shown on screen, in yuan. Sources: ../DESCRIPTION.md, ../research/05-subscription-recheck.md and
// ../research/07-v7-time-and-recheck.md. Dollars × 6.7195 (USD/CNY central parity, 2026-10-22).
export const USD_CNY = 6.7195;
const Y = (usd: number) => usd * USD_CNY;

// Monthly API-equivalent value at full use: lo = measured where available, hi = theoretical ceiling.
export const PLAN = {
  max20: { price: Y(200), lo: Y(7121), hi: Y(11726) }, // ¥1,344 / ¥47,850 / ¥78,793 (wokey.ai median of 17 accounts / SemiAnalysis)
  gptPro200: { price: Y(200), lo: Y(2084), hi: Y(2897) }, // ¥14,003 / ¥19,466 (SemiAnalysis: GPT-6.1 Sol / GPT-6 Astra)
};
