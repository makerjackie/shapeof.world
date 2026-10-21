// Subscription values shown on screen. Sources: ../DESCRIPTION.md and ../research/05-subscription-recheck.md.

// Monthly API-equivalent value at full use (USD): lo = measured where available, hi = theoretical ceiling.
export const PLAN = {
  max20: { price: 200, lo: 7121, hi: 11726 }, // wokey.ai median of 17 accounts / SemiAnalysis (Opus 5.5 agentic)
  gptPro200: { price: 200, lo: 2084, hi: 2897 }, // SemiAnalysis: GPT-6.1 Sol / GPT-6 Astra
};
