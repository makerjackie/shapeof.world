# 02: What AI coding subscriptions are worth at API prices (as of 2026-10-21)

**Question:** How many dollars of API-priced tokens does each flat-rate coding subscription deliver per month?
This is shown as an **API-$ per subscription-$ multiplier** and an **effective $ per 1M tokens**.

**Claim tested:** "A $200 Claude Max plan can deliver about $8,000, $18,000, or $20,000 of API-equivalent usage per month."

**Evidence labels used throughout:**
- **[OFFICIAL]**: a vendor page or vendor announcement.
- **[MEASURED-3P]**: a third party measured it across several accounts, with a stated method.
- **[ANECDOTAL]**: one user, a leaderboard self-report, a screenshot, or a forum post.
- **[DERIVED]**: my own arithmetic from the cited inputs. The assumptions are stated next to it.

---

## 0. Answer in brief

| Plan (price/mo) | Typical user (est.) | Full-limit / power user | Best evidence |
|---|---|---|---|
| Claude Pro ($20) | ~5–15x | **37x measured** (~$740/mo); 59x theoretical on Opus 5.5 | wokey.ai [MEASURED-3P], SemiAnalysis via explainx [MEASURED-3P] |
| Claude Max 5x ($100) | ~10–20x | **~57x** theoretical (~$5,700/mo) | SemiAnalysis via explainx |
| Claude Max 20x ($200) | ~10–25x ($2–5k) | **36x measured** (~$7,100/mo, 17 accounts); **59–63x** theoretical on Opus 5.5 / Sonnet 5.5 agentic (~$11.7–12.5k); outliers 54–131x | wokey, SemiAnalysis, ml0x [ANECDOTAL], delphipraxis [ANECDOTAL] |
| ChatGPT Plus ($20) via Codex | ~5–10x | **~10–15x** now (~$210–290/mo); was 25–37x in Jun–Jul 2026 | SemiAnalysis, finopsllm [MEASURED-3P] |
| ChatGPT Pro ($100/$200/$500) via Codex | ~3–8x | Pro 100: **7.6–10.6x**; Pro 200: **10–15x** (~$2.1–2.9k); old Pro 200 projections of 24–29x are not validated | SemiAnalysis, finopsllm, MindStudio |
| Google AI Pro ($19.99) via Gemini/Antigravity CLI | ~3–8x | ~10–20x [DERIVED], using observed quotas | gemini-cli issue #21395 [ANECDOTAL] |
| Google AI Ultra ($99.99 / $199.99) | unknown | no published numbers; theoretical ~8–15x [DERIVED] | cloudzero |
| GLM Coding Plan ($18 / ~$72–80 / ~$160–168) | ~2–4x | **~4–6x peak, up to ~8–13x off-peak** [DERIVED from official credit formula] | docs.z.ai |
| MiniMax Coding Plan ($10 / $20 / $50) | ~3–8x | ~13–26x at one full 5h window per workday [DERIVED] | MiniMax official quotas, aggregator API prices |
| Alibaba Qwen Coding Plan Pro (¥200 ≈ $28) | ~5–10x | ~20–70x at full 90k calls/mo [DERIVED] | help.aliyun.com |
| Kimi membership ($19–$199) | n/a | quotas not published in absolute units, so no multiplier is possible | — |
| Cursor (legacy Pro $20 / Pro+ $60 / Ultra $200) | ~1x | **1.0x / 1.17x / 2.0x** on frontier models, plus unlimited "Auto" | [OFFICIAL] via third-party mirrors |
| Cursor (new, from 2026-10-12) | 1.0x for Claude/GPT | Third-party models are billed at API list price. Grok usage is bundled, with no $ value published. | cursor.com/pricing [OFFICIAL] |
| GitHub Copilot (Pro $10 / Pro+ $39 / Max $100) | ≤1.5–2x | **1.5x / 1.8x / 2.0x** in AI credits, plus unlimited completions | github.com/features/copilot/plans [OFFICIAL] |

**Verdict on the $8k / $18k / $20k claim for a $200 Claude Max plan:**
- **About $8,000/month is realistic for someone who maxes the plan.**
  - The best multi-account measurement is wokey.ai: a median of $7,121/month across 17 Max 20x accounts, Oct 12–19, 2026.
  - SemiAnalysis prices the full monthly limit at $11,726 for agentic Opus 5.5 work.
- **$18,000–20,000 is not reachable on one account under current (Oct 2026) limits and prices.** It was reachable in two situations:
  - **(a) Before the Aug 28, 2025 weekly caps, at Opus 4 prices.** Opus 4 cost $15/$75 per MTok, which is 3–4x today's Opus 5.5 at $4/$20. Viberank's top users averaged $350–963/day in that period, which is roughly $10–29k/month.
  - **(b) During the summer-2026 +50% weekly promo, with an Opus 5 or Fable-heavy mix.** ml0x reported $26,187 for 2026-07-29 → 08-28. The delphipraxis user reported $10,798 for July 2026.
- **These numbers are a ceiling, not typical usage.** wokey's break-even point is about 18% of the weekly limit. Anthropic's own enterprise average works out to $150–250 per developer-month at API rates.

---

## 1. Claude (Pro / Max 5x / Max 20x) via Claude Code

### 1.1 What Anthropic officially states

- **[OFFICIAL] Max plan help page** ([support.claude.com/en/articles/11049741](https://support.claude.com/en/articles/11049741-what-is-the-max-plan), fetched 2026-10-21):
  - Max 5x costs $100/mo and gives 5x Pro's *per-session* allowance. Max 20x costs $200/mo and gives 20x.
  - A session resets every 5 hours.
  - A **weekly limit across all models** resets at a fixed time.
  - Anthropic "may also apply weekly or monthly caps, or limit specific models".
  - Max and Team plans also include monthly API credits, which do not cover Claude Code (see 1.5).
- **[OFFICIAL] Weekly caps announced 2025-07-28, effective 2025-08-28** ([TechCrunch 2025-07-28](https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/)). Estimates of weekly hours in Claude Code:

  | Plan | Sonnet 4 hours/week | Opus 4 hours/week |
  |---|---|---|
  | Pro | 40–80 | — |
  | Max 5x | 140–280 | 15–35 |
  | Max 20x | 240–480 | 24–40 |

  - Anthropic said the caps would affect "less than 5% of subscribers".
  - It cited users running Claude Code "continuously in the background, 24/7" and "sharing accounts and reselling access".
  - **Note:** Anthropic has not updated these hour figures since, and it does not publish absolute weekly limits ([implicator.ai](https://www.implicator.ai/anthropics-usage-based-billing-is-exact-its-plan-limits-are-vague-by-design/)).
  - The phrase "tens of thousands of dollars on a $200 plan" circulated at the time ([Kilo blog 2025-08-25](https://blog.kilo.ai/p/rate-limits-hit-again)). I did **not** find it in a primary Anthropic document.
- **[OFFICIAL] 2026-05-06: Claude Code 5-hour limits doubled** for Pro, Max, Team and seat-based Enterprise. The peak-hours reduction was removed for Pro and Max. Tied to the SpaceX Colossus 1 compute deal ([anthropic.com/news/higher-limits-spacex](https://www.anthropic.com/news/higher-limits-spacex)). Weekly caps were not mentioned.
- **[OFFICIAL] Claude Code cost docs** ([code.claude.com/docs/en/costs](https://code.claude.com/docs/en/costs), fetched 2026-10-21):
  - "Across enterprise deployments, the average cost is around $13 per developer per active day and $150-250 per developer per month, with costs remaining below $30 per active day for 90% of users."
  - **This is the best official anchor for a "typical user".** It is API-priced, so it is directly comparable to the plan prices.
- **[OFFICIAL] Current API list prices** ([platform.claude.com pricing](https://platform.claude.com/docs/en/about-claude/pricing), fetched 2026-10-21). All prices are $ per million tokens (MTok):

  | Model | Input | 5m cache write | Cache read | Output |
  |---|---|---|---|---|
  | Opus 5.5 | $4 | $5 | $0.20 | $20 |
  | Opus 5 / 4.5–4.8 | $5 | $6.25 | $0.50 | $25 |
  | Opus 4 / 4.1 (2025) | $15 | $18.75 | $1.50 | $75 |
  | Sonnet 5.5 | $2 | — | $0.10 | $10 |
  | Sonnet 4.x | $3 | — | $0.30 | $15 |
  | Fable 5.1 | $10 | — | $0.25 | $50 |

  - **Key consequence:** the *same* token volume that read as "$20k" in mid-2025 (Opus 4 at $15/$75) reads as roughly $5–7k at Opus 5.5 prices.
  - API-equivalent claims therefore deflate over time even when the limits do not change.

### 1.2 Timeline of limit changes

| Date | Change | Source / label |
|---|---|---|
| 2025-04-09 | Max launched: $100 = 5x Pro, $200 = 20x Pro | [Bloomberg](https://www.bloomberg.com/news/articles/2025-04-09/anthropic-to-offer-200-monthly-claude-chatbot-subscription) [OFFICIAL via press] |
| May–Aug 2025 | ccusage first commit (May 2025). Viberank leaderboard shows top spenders at $350–963/day API-equivalent. The #1 token user reportedly used 8 shared accounts. | [Kilo blog 2025-08-25](https://blog.kilo.ai/p/rate-limits-hit-again) [ANECDOTAL] |
| 2025-08-28 | Weekly caps added on top of the 5h windows | TechCrunch [OFFICIAL via press] |
| 2026-03-13 → 03-28 | Off-peak promo: 2x 5h limits | [explainx timeline](https://explainx.ai/blog/claude-usage-limits-2026-timeline-explained) [3P, no primary link] |
| 2026-05-06 | 5h limits doubled permanently; weekly caps unchanged | Anthropic [OFFICIAL] |
| 2026-06-15 | Proposed class action alleging Max 5x/20x users got less usage than advertised | [PYMNTS citing WSJ](https://www.pymnts.com/?p=3849004) [press] |
| 2026-07-18 → 09-13 | Temporary +50% Claude Code weekly limit, extended several times | explainx [3P] |
| 2026-09-14 | Promo replaced by a permanent +25% over baseline, which is a ~17% cut versus the promo level | [explainx 2026-08-30](https://explainx.ai/blog/anthropic-claude-code-limits-17-percent-cut-september-2026-august-2026) [3P, cites @ClaudeDevs on X] |
| 2026-09-22 | Opus 5.5 launch raised 5h limits on Pro/Max/Team. SemiAnalysis measured ~20% higher on Max and ~50% higher on Pro. | [wokey.ai](https://wokey.ai/claude-usage-limits) [MEASURED-3P] |
| ~2026-10-07 | Max 5x / 20x include $100 / $200 monthly API credits (not usable for Claude Code) | [intuitionlabs](https://intuitionlabs.ai/articles/claude-max-plan-pricing-usage-limits), [developersdigest 2026-10-08](https://www.developersdigest.tech/blog/claude-max-team-monthly-api-credits-2026) [3P] |

**Pattern:**
- **Tightening (2025):** weekly caps added. API prices also fell sharply over the period, from Opus 4 at $15/$75 to Opus 5.5 at $4/$20.
- **Loosening (2026):** 5h windows were doubled, then raised again.
- **The weekly cap is now the binding constraint for power users.** wokey measures Max 20x weekly value at only ~9.7x Pro, against the advertised 20x. The 20x multiplier applies to the session, not the week.

### 1.3 Measured value per plan

**wokey.ai, measured week 2026-10-12 → 10-19** [MEASURED-3P] ([wokey.ai/claude-usage-limits](https://wokey.ai/claude-usage-limits))

Method:
- Each account's weekly-meter % movement is matched to its API-priced traffic.
- Values are medians across accounts, published once a plan has at least 5 accounts.

| Plan | Weekly API value | ≈ Monthly | Multiplier | Total tokens/wk | Cache-read share | Accounts |
|---|---|---|---|---|---|---|
| Pro $20 | $170 | $738 | **37x** | 167M | 84% | 474 |
| Team Premium $125 | $861 | $3,732 | 30x | 1.24B | 92% | 216 |
| Max 20x $200 | $1,643 | $7,121 | **36x** | 2.17B | 90% | 17 |

- Break-even is reached at about **18% of the weekly limit** on both Pro and Max 20x.
- Max 20x weekly value over recent weeks: $1,404 (09-24), $1,510, $1,727, $1,751, $1,643 (10-19).

**SemiAnalysis, Oct 2026** (Megalaa, Kan, Patel; paywalled)

Reported via [explainx 2026-10-06](https://explainx.ai/blog/semianalysis-claude-vs-chatgpt-subscription-api-value-limit-testing-2026) [MEASURED-3P, secondary]. It prices the *full monthly limit* at list API rates.

| Plan | Opus 5.5 | Multiplier | Sonnet 5.5 agentic | Fable 5.1 |
|---|---|---|---|---|
| Claude Pro $20 | $1,178 | **58.9x** | — | not available |
| Claude Max 5x $100 | $5,725 | **57.3x** | — | $1,273 (12.7x) |
| Claude Max 20x $200 | $11,726 (agentic) / $9,200 (chat) | **58.6x / 46x** | $12,529 (62.6x); chat $7,009 | $2,485 (12.4x) |

**Single-user reports [ANECDOTAL]**

- **ml0x** ([ml0x.com/research/claude-max-vs-api-cost.html](https://ml0x.com/research/claude-max-vs-api-cost.html)), one Max 20x seat, 2026-07-29 → 08-28:
  - The window overlaps the +50% weekly promo.
  - 33.28B input tokens: 96.4% cache reads, 2.8% cache writes, 0.8% fresh. Plus 122M output tokens.
  - $26,187 at Opus 5 list prices, which is **131x**.
  - Method: ccusage-style dedup over 14,973 local session files.
  - The same traffic prices at $10,475 at Sonnet 5 rates.
- **delphipraxis forum** ([en.delphipraxis.net/topic/15732](https://en.delphipraxis.net/topic/15732-claude-api-v-subscription/)), "subscription for Claude Code" (tier not stated), July 2026:
  - **$10,798** in one month: Fable 5 $6.9k, Opus 4.8 $2.5k, Opus 5 $1.6k.
  - 11.3B tokens, 98.5% cache reads.
- **Viberank** (via [Kilo blog 2025-08-25](https://blog.kilo.ai/p/rate-limits-hit-again)), mid-2025:
  - Top spender averaged **$963/day**, about $29k/month at Opus 4 prices.
  - Leaders typically ran $350–900/day.
  - Viberank validation caps a day at $5,000.
  - Some leaders used **multiple accounts**.
  - viberank.app itself returned HTTP 402 when fetched on 2026-10-21, so I could not verify current figures.
- **ccgather.com** leaderboard, fetched 2026-10-21: all-time top shows "$54K / 15.0B tokens". User names are placeholders ("User1"), so treat it as **unreliable or demo data**.
- **MindStudio 2026-09-09** ([link](https://www.mindstudio.ai/blog/codex-vs-claude-code-subscription-value)):
  - Projects Max 20x at only "just over $2,000" and Pro at ~$101/mo.
  - The projection assumes **one** full 5h window per day. The weekly meter did not visibly move during the test.
  - Treat this as a **low/typical-use** illustration.
- **blitzmetrics** ([link](https://blitzmetrics.com/claude-max-plan-200-dollars-biggest-discount-ai-token-math/)): a user reports $35–53/day of API-equivalent usage on Max, which is roughly $1,050–1,600/mo, or **5–8x** [ANECDOTAL, promotional].

### 1.4 Effective price per 1M tokens (Claude) [DERIVED]

| Case | Tokens/month | Subscription $/MTok (all tokens) | API $/MTok at same mix |
|---|---|---|---|
| Pro, wokey median | 167M × 4.33 ≈ 723M | **$0.028** | $1.02 |
| Max 20x, wokey median | 2.17B × 4.33 ≈ 9.4B | **$0.021** | $0.76 |
| Max 20x, wokey, uncached tokens only (223M/wk ≈ 966M/mo) | 966M | $0.21 per uncached MTok | — |
| Max 20x, ml0x outlier | 33.4B | **$0.006** | $0.78 (Opus 5) |

Because 84–98% of Claude Code tokens are cache reads, "$ per token" figures are dominated by cache-read pricing.

### 1.5 Typical vs power user (Claude) [DERIVED]

**Typical active developer.**
- Anthropic's enterprise figure is $150–250/month API-equivalent. Most Pro subscribers are lighter than that.
- On Pro, ~$100–300 of value is **5–15x**.
- On Max 20x, a typical buyer is heavier, ~$2–5k/mo, which is **10–25x**. This is consistent with MindStudio ($2k), blitzmetrics ($1–1.6k) and the findskill "$5,000" anecdote ([findskill.ai](https://findskill.ai/blog/claude-code-subscription-pricing-guide/)).

**Power user who hits the weekly cap every week.**
- **Pro: 37–59x.**
- **Max 5x: ~57x** (theoretical).
- **Max 20x: 36x measured, ~59x theoretical.** Short promo windows produced 50–130x.

---

## 2. OpenAI ChatGPT Plus / Pro via Codex CLI

### 2.1 Official limits

From [learn.chatgpt.com/docs/pricing](https://learn.chatgpt.com/docs/pricing) (redirect from developers.openai.com/codex/pricing), fetched 2026-10-21 [OFFICIAL].

**Plans:**
- Plus $20.
- Pro $100 / $200 / $500. Ultrafast mode is only on $500.
- Business $20–25/seat.

**Plus local messages per 5h:**

| Model | Messages / 5h |
|---|---|
| GPT-6 Astra | 5–45 |
| GPT-6.1 Sol | 15–160 |
| GPT-6 Sol | 15–150 |
| GPT-6 Luna | 350–3,000 |

**Other rules:**
- Weekly limits "may also apply". No figures are given.
- "Pro currently has no five-hour limit."
- No numeric Pro-vs-Plus multiplier is printed on the current page. Earlier copies said 5x / 20x.
- Fast mode uses the allowance 2.5x faster. Ultrafast uses it 8x faster.
- Credit rates for GPT-6.1 Sol: 50 / 2.5 / 250 credits per MTok (input / cached / output).

**API:** GPT-6.1 Sol costs $2 input / $0.10 cached / $10 output per MTok ([standardcompute](https://standardcompute.com/codex-usage-limits) [3P, competitor]).

### 2.2 Timeline

| Date | Change |
|---|---|
| 2025 (GPT-5-Codex era) | Plus ~30–150 local msgs/5h; Pro "20x Plus". Weekly caps added in late 2025 ([OpenAI community thread](https://community.openai.com/t/issue-with-gpt-5-codex-limits-despite-having-pro-subscription/1359497)) [ANECDOTAL/OFFICIAL mix] |
| 2026-07-12 | 5h limit temporarily removed for Plus, Business and Pro ([eesel](https://www.eesel.ai/blog/gpt-remove-5-hour-limits)) [3P] |
| 2026-08 | Default model moved from GPT-5.5 ($5/$30) to Sol ($2/$10). The same quota is now worth fewer API-$ ([finopsllm](https://finopsllm.com/research/codex-usage-limits-chatgpt-pro)) [MEASURED-3P] |
| 2026-08-25 | 5h limit back for Plus. Pro stays exempt "for the upcoming months" ([sessionwatcher](https://sessionwatcher.com/guides/codex-rate-limits-explained)) [3P] |
| 2026-09-10 | New sign-ups for $200 Pro paused (per buildthisnow, cited by finopsllm) [3P] |
| 2026-09-29 | Pro 500 launched. Pro 200 reopened with a **smaller allowance**: about 10x Plus versus the old 20x, roughly half the old API-$ value. Existing subscribers keep the old allowance to 2026-10-29 ([standardcompute](https://standardcompute.com/codex-usage-limits), [taskade](https://www.taskade.com/blog/codex-pricing-explained)) [3P; subscriber emails unverified] |

### 2.3 Measured value

**finopsllm** [MEASURED-3P] ([link](https://finopsllm.com/research/codex-usage-limits-chatgpt-pro), updated 2026-10-10).
Method: Codex logs the weekly-gauge % with each request, so value = 100 × API$ ÷ %-points used. Windows under 30 points are excluded.

- **Plus:**
  - A full week is worth a median **$67** since Aug 2026, about $290/mo or **~14.5x**.
  - Before August it was about $115/week, roughly $500/mo or 25x.
  - The page's monthly series reads: Jun $302 (15x), Jul $736 (37x), Aug $640 (32x). This conflicts with its own weekly median; the series is the summer peak.
- **Pro 100:** a measured full week is worth **$175**, about $760/mo or **7.6x**. That is only 2.6x Plus, not 5x.
- **Pro 200 (old 20x):** projected at $1,340/week (~$5.8k/mo, 29x). Labelled *untested*.

**SemiAnalysis Oct 2026** (via [explainx](https://explainx.ai/blog/semianalysis-claude-vs-chatgpt-subscription-api-value-limit-testing-2026)), full monthly limit [MEASURED-3P, secondary]:

| Plan | GPT-6.1 Sol | GPT-6 Astra |
|---|---|---|
| Plus | $211 (10.6x) | $162 (8.1x) |
| Pro 100 | $1,055 (10.6x) | $1,322 (13.2x) |
| Pro 200 | **$2,084 (10.4x)** | **$2,897 (14.5x)** |
| Pro 500 | "about 21% more Astra than the old $200 plan" | — |

**MindStudio 2026-09-09** [ANECDOTAL, n=1]: 43 minutes of work moved the Pro 20x weekly meter by 3% and cost about $34 at API prices. That projects to **~$4,900/mo (24.5x)** under the *old* Pro 200 allowance ([link](https://www.mindstudio.ai/blog/codex-vs-claude-code-subscription-value)).

**Takeaway:**
- On mid-tier models, Codex delivers **~10–15x at full use**, versus Claude's **~36–59x**.
- SemiAnalysis says Claude gives about 5x more API-$ per subscription-$ on mid-tier models. The gap closes at the flagship tier (Fable 5.1 vs Astra: ~12x vs ~8–15x).

---

## 3. Google AI Pro / Ultra via Gemini CLI, now Antigravity CLI

- **[OFFICIAL] Gemini CLI quota page** ([geminicli.com/docs/resources/quota-and-pricing](https://geminicli.com/docs/resources/quota-and-pricing/), last updated 2026-06-18):
  - Daily request caps: Code Assist Individual (free) 1,000, Google AI Pro 1,500, Google AI Ultra 2,000.
  - "Gemini CLI was replaced by Antigravity CLI on June 18th, 2026" for Google One and unpaid-tier users.
- **[ANECDOTAL] Actual quotas were far lower than published** ([gemini-cli issue #21395](https://github.com/google-gemini/gemini-cli/issues/21395), March 2026):
  - AI Pro users saw only **~100–150 Pro-model requests/day**, plus ~1,000 Flash.
  - A maintainer said in Jan 2026 that Ultra has "a large amount" of Pro quota ([#12859](https://github.com/google-gemini/gemini-cli/issues/12859)).
- **[3P] Antigravity era** ([cloudzero](https://www.cloudzero.com/blog/google-antigravity-pricing/)):
  - AI Pro costs $19.99.
  - Ultra 5x costs $99.99 (new on 2026-05-19). Ultra 20x costs $199.99, cut from $249.99 the same day.
  - Quota refreshes every 5h under a weekly ceiling. Flash and Pro pools were merged on 2026-05-19.
  - **No absolute quota figures are published.**
  - Forum threads report multi-day lockouts ([discuss.ai.google.dev](https://discuss.ai.google.dev/t/antigravitys-usage-quota-is-very-restrictive/146716)) [ANECDOTAL].
- **[DERIVED] Multiplier estimate.** Assumptions: ~40k context per call, 75% cached, 500 output tokens, Pro-class model at ~$2 / $0.20 cached / $12 output per MTok. That is about $0.03 per Pro call; Flash calls are about $0.006.
  - Observed AI Pro quota (~120 Pro + ~1,000 Flash per day): about $3.6 + $6 ≈ $10/day, roughly $200–300/mo at full daily use. That is **~10–15x** of $19.99.
  - The published 1,500/day cap, if it were all Pro-model calls, would be about $1,400/mo (~70x). The reports above suggest this is not achievable.
  - **No third-party measurement found.** Treat this row as low-confidence.

---

## 4. Chinese "coding plans"

### 4.1 Z.ai GLM Coding Plan

**[OFFICIAL] Credit quotas** ([docs.z.ai/devpack/overview](https://docs.z.ai/devpack/overview), fetched 2026-10-21):

| Tier | 5h credits | Weekly credits | Z.ai's estimated weekly tokens (GLM-5.3, 95% cache hit) |
|---|---|---|---|
| Lite | 2,000 | 10,000 | 48–97M |
| Pro | 12,000 | 60,000 | 290–580M |
| Max | 28,000 | 140,000 | 676–1,352M |

- Credit formula for GLM-5.3: (input × 6.9 + cached × 1.7 + output × 24) / 10,000.
- Off-peak usage costs 50%. Peak is Mon–Fri 14:00–18:00 UTC+8.
- Lite "starts at $18/mo". Pro and Max cost ~$72–80 and ~$160–168: [techsy Jul 2026](https://techsy.io/en/blog/glm-5-2-coding-plan), [morphllm Oct 2026](https://www.morphllm.com/coding-plan) [3P].
- CNY pricing rose about 30% on 2026-02-12 ([codepick](https://codepick.dev/en/compare/minimax-coding-plan-vs-glm-coding-plan/)).
- **Earlier quota unit:** prompts. Lite ~80, Pro ~400, Max ~1,600 per 5h, with 1 prompt ≈ 15–20 model calls ([docs.z.ai/devpack/faq](https://docs.z.ai/devpack/faq), older text quoted by search).

**[DERIVED] Value in API dollars:**
- GLM-5.3 API list price is $1.40 input / $0.26 cached / $4.40 output per MTok (per ml0x, 2026-08-28).
- Calibrating the credit formula against those prices gives 1 credit ≈ **$0.0015–0.002**, call it $0.0017.

| Tier | Weekly value | ≈ Monthly | Multiplier (peak) | Multiplier if all off-peak |
|---|---|---|---|---|
| Lite | ~$17 | ~$74 | **~4x** | ~8x |
| Pro | ~$100 | ~$440 | **~6x** | ~12x |
| Max | ~$240 | ~$1,030 | **~6x** | ~13x |

- Effective price on Max: about **$0.03–0.06 per MTok**, versus ~$0.32/MTok blended at the API.
- Low multipliers are expected here: the underlying API is already cheap.

### 4.2 MiniMax Coding Plan

- **[OFFICIAL, via search snapshot]** of platform.minimax.io:
  - Starter $10 = 100 prompts per 5h. Plus $20 = 300. Max $50 = 1,000.
  - High-speed variants cost $40 / $80 / $150.
  - About 15 model calls per prompt ([codepick](https://codepick.dev/en/compare/minimax-coding-plan-vs-glm-coding-plan/)).
  - The direct page returned 404 on 2026-10-21, so the figures could not be re-verified live.
- **[DERIVED] Value estimate.**
  - Assumptions: M2.5 at ~$0.30 input / $0.06 cached / $1.20 output per MTok (aggregators, [anotherwrapper](https://anotherwrapper.com/tools/llm-pricing/minimax-m2.5/qwen36-plus)), 40k context, 90% cached, 500 output tokens. That is ≈ $0.004 per call, or $0.06 per prompt.
  - One full window is worth about $6 (Starter), $18 (Plus) or $60 (Max).
  - One full window per workday (22/mo): **~13x / 20x / 26x**.
  - No weekly cap was found in the official snapshot, so the theoretical ceiling is much higher. This is low-confidence.

### 4.3 Alibaba Cloud Model Studio, Qwen Coding Plan

- **[OFFICIAL]** ([help.aliyun.com/en/model-studio/coding-plan](https://help.aliyun.com/en/model-studio/coding-plan)):
  - Pro costs **¥200/mo (≈ $28)**.
  - Quota: 6,000 requests per 5h, 45,000 per week, 90,000 per month. Each **model call** counts as a request: a simple task is 5–10 calls, a complex one 10–30 or more.
  - Models: qwen3.7-plus, qwen3.6-plus, kimi-k2.5, glm-5, MiniMax-M2.5.
  - **Lite** closed to new buyers on 2026-03-20 and to renewals on 2026-04-13.
- **[DERIVED] Value estimate.**
  - qwen3.6-plus costs ~$0.50 input / $3 output per MTok (aggregator).
  - At 40k context and 500 output tokens, a call costs ~$0.007 with a cache discount and ~$0.02 without.
  - The full 90,000 calls/month is worth ≈ **$630–1,900, or ~20–70x**. A typical user who uses 10–20% of it gets ~5–10x.

### 4.4 Moonshot Kimi

- **Tiers** ([codeagentswarm, Help Center table verified 2026-07-19](https://www.codeagentswarm.com/en/guides/kimi-code-plans-and-pricing), via search snippet):
  - $19, $39, $99 and $199, giving roughly 1x / 5x / 15x / 30x Kimi Code usage.
  - Usage comes from a shared credit pool with a weekly limit plus a 5h window.
- **Possible newer change** ([KuCoin news](https://www.kucoin.com/news/flash/kimi-launches-new-subscription-tiers-after-two-month-pause-kimi-code-not-sold-separately), year unclear):
  - Tiers renamed to Go / Plus / Pro / Max on Sep 18.
  - Kimi Code reportedly needs at least the ¥948 Plus plan.
- **No absolute quota is published, so no API-$ multiplier can be computed.**
- API reference: Kimi K3 costs $3 input / $0.30 cached / $15 output per MTok (ml0x), which makes it a relatively expensive token to "save" on.

---

## 5. Cursor

- **2025-06-16:**
  - Pro ($20) moved from 500 fast requests to **$20 of model usage at API rates** plus unlimited Auto.
  - Ultra ($200) launched with "20x Pro".
  - Cursor apologized on 2025-07-04 and refunded June 16 – July 4 overages ([TechCrunch 2025-07-07](https://techcrunch.com/2025/07/07/cursor-apologizes-for-unclear-pricing-changes-that-upset-users/)) [OFFICIAL via press].
- **Through Oct 2026 (legacy plans)** [3P mirrors of the official page]:
  - Pro $20 includes $20 of usage: **1.0x**.
  - Pro+ $60 includes $70: **1.17x**.
  - Ultra $200 includes $400: **2.0x**.
  - Auto mode is unmetered ([emergent](https://emergent.sh/learn/cursor-pricing), [tessl](https://tessl.io/blog/cursor-new-pricing-structure-explained)).
- **2026-10-12, new plans** ([cursor.com/pricing](https://cursor.com/pricing) [OFFICIAL], fetched 2026-10-21; context in [smartscope](https://smartscope.blog/en/blog/cursor-x-subscription-pricing-third-party-models-2026/)):
  - Plus $8, Premium $30, Super $100, Ultra $200, with 1x / 4x / 15x / 50x usage relative to Plus. The bundled usage is for **Grok models**.
  - **Third-party models (Claude, GPT) are "billed separately by usage" at API list price, which is 1.0x.**
  - Existing subscribers keep their legacy included usage until they switch.
- **Conclusion:** Cursor resells API usage close to cost. Its value comes from Tab/Auto and the bundled Grok model, not from discounted frontier tokens.

---

## 6. GitHub Copilot

- **Legacy, 2025 to May 2026** [OFFICIAL] ([docs: request-based billing legacy](https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/copilot-requests)):
  - Pro $10 includes 300 premium requests/mo. Pro+ $39 includes 1,500.
  - Extra requests cost $0.04 each, with model multipliers applied.
  - **[DERIVED]** One premium request could be a long agent turn on Sonnet-class models worth $0.10–$1 or more at API prices. Heavy agent users could therefore extract roughly 5–30x. This was the arbitrage window.
- **From 2026-06-01: usage-based billing in AI Credits** ([GitHub changelog 2026-04-27](https://github.blog/changelog/2026/04/27/github-copilot-is-moving-to-usage-based-billing/); plans page [github.com/features/copilot/plans](https://github.com/features/copilot/plans), fetched 2026-10-21) [OFFICIAL]:
  - 1 credit = $0.01, metered by tokens.

  | Plan | Price | AI credits | Multiplier |
  |---|---|---|---|
  | Pro | $10 | $10 + $5 flex = $15 | **1.5x** |
  | Pro+ | $39 | $39 + $31 = $70 | **1.8x** |
  | Max | $100 | $100 + $100 = $200 | **2.0x** |

  - Completions and next-edit suggestions are unlimited and are not counted.
  - The "flex" portion "may change over time".
  - Annual subscribers stay on request-based billing with higher multipliers until renewal.

---

## 7. Cross-plan comparison: effective cost per 1M tokens and multipliers

Full-use figures are the best evidence. "Typical" figures are my estimates, anchored on Anthropic's $150–250/dev-month and the break-even points.

| Plan | $/mo | Full-use API-$ / mo | Full-use multiplier | Typical multiplier | Effective $/MTok at full use |
|---|---|---|---|---|---|
| Claude Pro | 20 | 738 (measured) – 1,178 (theoretical) | 37–59x | 5–15x | ~$0.028 |
| Claude Max 5x | 100 | ~5,725 (theoretical) | ~57x | 10–20x | ~$0.02 (est.) |
| Claude Max 20x | 200 | 7,121 (measured) – 12,529 (theoretical) | 36–63x | 10–25x | ~$0.021 (measured); $0.006 outlier |
| ChatGPT Plus (Codex) | 20 | 211–290 | 10–15x | 5–10x | — (per-token logs not published) |
| ChatGPT Pro 100 | 100 | 760–1,055 | 7.6–10.6x | 3–8x | — |
| ChatGPT Pro 200 (new) | 200 | 2,084–2,897 | 10–15x | 3–8x | — |
| Google AI Pro | 19.99 | ~200–300 (derived) | ~10–15x | 3–8x | — |
| GLM Max | ~165 | ~1,030 (2,060 off-peak) | 6–13x | 2–4x | $0.03–0.06 |
| MiniMax Max | 50 | ~1,320 (1 window/workday) | ~26x | 3–8x | — |
| Qwen Pro (Alibaba) | ~28 | 630–1,900 | 20–70x | 5–10x | — |
| Cursor Ultra (legacy) | 200 | 400 (+ Auto) | 2.0x | ≤2x | ≈ API list |
| Copilot Max | 100 | 200 credits | 2.0x | ≤2x | ≈ API list |

---

## 8. Caveats

1. **"API-equivalent" is a ceiling, not cash saved.**
   - 84–98% of Claude Code tokens are cache reads. A user paying API prices would change their behaviour: shorter contexts, a cheaper model, fewer agents.
   - "Value" also depends on which model's price you pick. For the same Max 20x traffic, ml0x reports $26k at Opus 5, $10.5k at Sonnet 5 and $2.1k at DeepSeek V4 Pro.
2. **API price cuts deflate the numbers.** Opus went from $15/$75 (Opus 4, 2025) to $4/$20 (Opus 5.5, 2026). Headline figures from 2025 ($20k+/month) are not comparable to 2026 figures.
3. **Promos inflate the numbers.** Many 2026 "$10k–26k" screenshots come from the 2026-07-18 → 09-13 window, when weekly limits were +50%.
4. **Leaderboards are self-reported and include multi-account users.**
   - Viberank (2025) and ccgather (2026) have no plan verification.
   - The ccgather data looks like placeholder or demo data.
   - viberank.app was not reachable (HTTP 402) on 2026-10-21.
5. **Many secondary sources are not primary.**
   - explainx.ai summarizes SemiAnalysis, which is paywalled.
   - Several timeline items (the Sep 2026 "+25% / −17%" change, the Pro 200 downsizing) rest on X posts or subscriber emails, not vendor pages.
6. **ccusage** ([github.com/ryoppippi/ccusage](https://github.com/ryoppippi/ccusage), ~19.1k stars) is the de-facto measuring tool.
   - It reads local logs for 18 agents, including Claude Code, Codex, Gemini, Kimi, Qwen and Copilot CLI.
   - It prices tokens with LiteLLM price tables.
   - It reports *list-price* cost, not what a subscriber pays.
