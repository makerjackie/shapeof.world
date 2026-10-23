// Subscription values shown on screen. Sources: ../DESCRIPTION.md, ../research/05-subscription-recheck.md and
// ../research/07-v7-time-and-recheck.md. Dollars × 6.7195 (USD/CNY central parity, 2026-10-22).
export const USD_CNY = 6.7195;

// Claude Max 20x: $200 a month; a fully used month is worth $7,121 at API prices (wokey.ai median of 17 accounts).
export const PLAN = { price: 200 * USD_CNY, worth: 7121 * USD_CNY }; // ≈ ¥1,344 and ¥47,850
