# 05: Subscription value re-check (as of 2026-10-21)

Purpose: verify and extend `02-subscriptions.md`. All figures are API-equivalent dollars per month (what the same tokens would cost at first-party list API prices). This is a ceiling on value, not cash saved.

Labels: **[OFFICIAL]** vendor page or vendor statement; **[MEASURED-3P]** third party, stated method, more than one account or a controlled test; **[ANECDOTAL]** one user, forum post, or self-report; **[DERIVED]** my arithmetic from cited inputs.

"Theoretical" = full plan limit priced at list rates (SemiAnalysis method). "Measured" = real traffic matched to usage-meter movement.

---

## 0. Answer table

### 0.1 Claude

| Plan | Price | Monthly API-$ value | Multiplier | Type | Source | Date |
|---|---|---|---|---|---|---|
| Claude Pro | $20 | $1,178 (Opus 5.5, agentic) | 58.9x | Theoretical [MEASURED-3P, secondary] | SemiAnalysis via [explainx](https://explainx.ai/blog/semianalysis-claude-vs-chatgpt-subscription-api-value-limit-testing-2026), [orcarouter](https://www.orcarouter.ai/blog/claude-opus-5-5-vs-gpt-6-1-sol-subscription-value) | report 2026-10-05 |
| Claude Pro | $20 | $738 ($170/wk, 474 accounts) | 37x | Measured [MEASURED-3P] | [wokey.ai](https://wokey.ai/claude-usage-limits) | week 10-12→10-19 |
| Claude Max 5x | $100 | $5,725 (Opus 5.5, agentic) | 57.3x | Theoretical [MEASURED-3P, secondary] | SemiAnalysis via explainx | 2026-10-05 |
| Claude Max 5x | $100 | ≥ $5,270 (≥ $1,217/wk; cap never hit) | ≥ 53x | Measured, 1 user [ANECDOTAL] | [finopsllm](https://finopsllm.com/research/claude-max-20x-vs-5x-weekly-limit) | Sep 2026, upd. 10-10 |
| Claude Max 5x | $100 | ~$4,300–5,200 ($1,000–1,200/wk) | 43–52x | Measured, 2 accounts, during +50% promo, Opus 5 / Fable 5 prices [MEASURED-3P, small n] | [Classmethod DevelopersIO](https://dev.classmethod.jp/articles/claude-max-20x-weekly-limit-not-4x/) | 2026-08-20 |
| Claude Max 5x | $100 | ~$5,400 ($1,250/wk, Opus only) | ~54x | 1 user, method not stated [ANECDOTAL] | [80aj (relays Linux.do)](https://www.80aj.com/2026/10/19/claude-max-5x-value/) | 2026-10-19 |
| Claude Max 5x | $100 | not yet published (1 account) | — | — | wokey.ai | 2026-10-19 |
| Claude Max 20x | $200 | $11,726 (Opus 5.5 agentic); $12,529 (Sonnet 5.5 agentic); $9,200 (Opus chat) | 58.6x / 62.6x / 46x | Theoretical [MEASURED-3P, secondary] | SemiAnalysis via explainx | 2026-10-05 |
| Claude Max 20x | $200 | $7,121 ($1,643/wk, 17 accounts) | 36x | Measured [MEASURED-3P] | wokey.ai | week 10-12→10-19 |
| Claude Max 20x | $200 | ~$8,050 ($1.86k/wk, promo scaled to post-promo) | ~40x | Measured, 1 user [ANECDOTAL] | [finopsllm](https://finopsllm.com/research/claude-max-vs-chatgpt-pro-codex-200) | Aug–Sep 2026 |

### 0.2 ChatGPT (via Codex)

| Plan | Price | Monthly API-$ value | Multiplier | Type | Source | Date |
|---|---|---|---|---|---|---|
| ChatGPT Plus | $20 | $211 (GPT-6.1 Sol); $162 (GPT-6 Astra) | 10.6x / 8.1x | Theoretical [MEASURED-3P, secondary] | SemiAnalysis via explainx | 2026-10-05 |
| ChatGPT Plus | $20 | ~$290 ($67/wk median) | ~14.5x | Measured, 1 user, 27 weekly windows [ANECDOTAL] | [finopsllm](https://finopsllm.com/research/codex-usage-limits-chatgpt-pro) | Aug–Oct 2026 |
| ChatGPT Pro 100 (5x Plus) | $100 | $1,055 (Sol); $1,322 (Astra) | 10.6x / 13.2x | Theoretical [MEASURED-3P, secondary] | SemiAnalysis via explainx | 2026-10-05 |
| ChatGPT Pro 100 | $100 | ~$760 ($175/wk median; range $100–234) | ~7.6x (= 2.6x Plus, not 5x) | Measured, 1 user, 6–8 windows [ANECDOTAL] | [finopsllm](https://finopsllm.com/research/chatgpt-pro-100-real-codex-multiplier) | 09-27→10-08 |
| ChatGPT Pro 200, new (10x Plus) | $200 | $2,084 (Sol); $2,897 (Astra) | 10.4x / 14.5x | Theoretical [MEASURED-3P, secondary] | SemiAnalysis via explainx | 2026-10-05 |
| ChatGPT Pro 200, grandfathered (20x, until 10-29) | $200 | ~$4,200 (Sol) | ~21x | [DERIVED] 2 × new Pro 200 | — | valid to 2026-10-29 |
| ChatGPT Pro 500 (25x Plus) | $500 | ~$5,200 (Sol); ~$7,000–7,200 (Astra) | ~10.5x / ~14x | [DERIVED] 2.5 × new Pro 200; SemiAnalysis: "~21% more Astra than old $200 plan" | explainx | 2026-10-05 |

### 0.3 Head-to-head at the same price

| Price | Claude vs ChatGPT | Theoretical (SemiAnalysis) | With measured Claude numbers | Flagship models (Fable 5.1 vs Astra) |
|---|---|---|---|---|
| $20 | Pro vs Plus | $1,178 vs $211 → **5.6x** | $738 (wokey) vs ~$290 (finopsllm) → **~2.5x** [DERIVED] | Fable not on Pro; Astra $162 |
| $100 | Max 5x vs Pro 100 | $5,725 vs $1,055 → **5.4x** | ≥$5,270 vs ~$760, both 1 user → **~7x** [DERIVED, ANECDOTAL inputs] | $1,273 vs $1,322 → **0.96x (level)** |
| $200 | Max 20x vs Pro 200 (new) | $11,726 vs $2,084 → **5.6x** | $7,121 (wokey) vs $2,084 → **3.4x** [DERIVED] | $2,485 vs $2,897 → **0.86x (ChatGPT slightly ahead)** |
| $200 | Max 20x vs Pro 200 (grandfathered, to 10-29) | $11,726 vs ~$4,200 → **~2.8x** [DERIVED] | $7,121 vs ~$4,200 → ~1.7x [DERIVED] | — |

**Verdict on "Claude's real quota is much higher than GPT Pro's":**
- **Confirmed, as of October 2026, for mid-tier models in API dollars.** Claude gives about 5.4–5.6x more theoretical API value at every price point, and about 3.4x when measured real Claude traffic is compared with OpenAI's theoretical maximum.
- **Same per-token price, still higher.** Sonnet 5.5 and GPT-6.1 Sol both list at $2/$10 per MTok. Max 20x on Sonnet 5.5 is $12,529 vs Pro 200 on Sol at $2,084, which is **about 6x more tokens** [DERIVED].
- **Not confirmed at the flagship tier.** Fable 5.1 vs GPT-6 Astra is roughly level, and ChatGPT is slightly ahead at $200.
- **Smaller gap per finished task.** Opus 5.5 costs about 3.3x (DataCamp) to 6.4x (Artificial Analysis, medium effort) more per task than Sol.
  - The ~5.6x API-$ gap therefore shrinks to roughly **0.9–1.7x more finished tasks** for Claude [DERIVED].
  - finopsllm concludes ChatGPT Pro buys ~2.4x more finished tasks at $200, but only under the old 20x Pro allowance, which it calls unverified.
- **The ranking flipped recently.** SemiAnalysis's June 10, 2026 test found the reverse: ChatGPT Pro about $14,000/mo (~70x) vs Claude Max 20x about $8,000/mo (~40x) ([GIGAZINE 2026-06-12](https://gigazine.net/gsc_news/en/20260612-anthropic-openai-subscription-margin)). Three changes reversed it:
  - OpenAI's August default-model switch to cheaper Sol.
  - The Sep 29 Pro 200 halving.
  - Opus 5.5's Sep 22 price cut and limit increase.

### 0.4 How the Claude tiers compare per week

| Ratio | Value | Type | Source |
|---|---|---|---|
| Max 20x 5h window ÷ Pro 5h window | 20x | [OFFICIAL] "20 times the Pro plan's per-session usage allowance" | [support.claude.com 11049741](https://support.claude.com/en/articles/11049741-what-is-the-max-plan) |
| Max 20x 5h window ÷ Pro 5h window, measured | ~15x ($205 vs $14) | [MEASURED-3P] | wokey.ai |
| **Max 20x week ÷ Pro week** | **9.7x** | [MEASURED-3P] | wokey.ai |
| Max 20x week ÷ Pro week | 10.0x ($11,726 / $1,178) | [DERIVED] from SemiAnalysis | explainx |
| **Max 5x week ÷ Pro week** | **4.9x** ($5,725 / $1,178) | [DERIVED] from SemiAnalysis | explainx |
| **Max 20x week ÷ Max 5x week** | **2.05x** ($11,726 / $5,725) | [DERIVED] from SemiAnalysis | explainx |
| Max 20x week ÷ Max 5x week | 2.1x ($1,100 vs $523/wk, Opus 4.6) | [ANECDOTAL] 1 pipeline, Feb 2026, before the May limit doubling | [botfarm](https://botfarm.run/blog/claude-max-true-price/) |
| Max 20x week ÷ Max 5x week | ≤ ~1.5x (5x cap never hit) | [ANECDOTAL] | finopsllm |
| Max 20x week ÷ Max 5x week | ~3.5x (range 3.1–3.9) | [MEASURED-3P, n=3] during +50% promo | Classmethod 2026-08-20 |
| 2025 official hour estimates: Pro / 5x / 20x | Sonnet 40–80 / 140–280 / 240–480 h → 20x ≈ 6x Pro, 5x ≈ 3.5x Pro, 20x ≈ 1.7x 5x | [OFFICIAL via press, 2025-07-28; since removed] | TechCrunch; [growthcab](https://www.growthcab.com/claude-max-usage-limits) |
| Full 5h windows per week before weekly cap binds | Pro ≈ 13; Max 20x ≈ 8 (of ~33.6 possible) | [MEASURED-3P] | wokey.ai |

**Takeaway:**
- "5x" and "20x" are **per-5-hour-session** multipliers.
- **Per week, Claude scales almost exactly with price**: Pro : Max 5x : Max 20x ≈ 1 : 5 : 10, matching prices of $20 : $100 : $200. All three are ~57–59x theoretical.
- Max 20x buys a bigger burst per 5h window and about 2x the weekly total of Max 5x, not 4x.
- Anthropic publishes no absolute weekly limit [OFFICIAL]. Kahn v. Anthropic (3:26-cv-05763, N.D. Cal.) alleges 20x ≈ 6–8x Pro and 5x ≈ 3.5x Pro. These are unproven allegations; the hearing is set for 2026-11-06 ([thenextweb](https://thenextweb.com/news/anthropic-lawsuit-claude-max-plans-usage-limits), [growthcab](https://www.growthcab.com/claude-max-usage-limits)).

### 0.5 Break-even and typical-user value (Claude) [DERIVED]

**Break-even vs paying API list price for the same traffic** = plan price ÷ full monthly API value.

| Plan | Break-even, % of weekly limit used | Inputs |
|---|---|---|
| Pro | **1.7–2.7%** | $20 ÷ $1,178 (SemiAnalysis) to $20 ÷ $738 (wokey) |
| Max 5x | **~1.7–2.3%** | $100 ÷ $5,725 (SemiAnalysis) to $100 ÷ ~$4,300 (Classmethod low) |
| Max 20x | **1.7–2.8%** | $200 ÷ $11,726 to $200 ÷ $7,121 |

**Correction to 02.** wokey's "18% break-even" is against **wokey's own pay-as-you-go gateway price**, not the official API.
- wokey's wording: "if you use less than 18% of its weekly limit, Wokey pay-as-you-go costs less".
- Against official list prices the break-even is about 2–3%.
- wokey sells discounted Claude access, so it has a commercial interest here.

**Upgrade break-evens** (because per-dollar value is flat across tiers):
- **Pro → Max 5x.** If you would otherwise buy usage credits at API rates, Max 5x costs $80 more and pays off once your overflow beyond Pro's weekly cap exceeds ~$80/mo. That is only ~7–11% above Pro's full limit.
- **Max 5x → Max 20x.** Max 20x gives ~2x the weekly total for 2x the price. Its extra advantage is the 4x larger 5-hour burst.
  - It is worth it only if you exceed Max 5x's weekly cap, or keep hitting its 5-hour cap.
  - Equivalently, you need to use more than ~50% of Max 20x's weekly limit. Below that, Max 5x holds the same week.

**Typical user.** The official anchor is "$150–250 per developer per month" at API rates, across enterprise deployments ([code.claude.com/docs/en/costs](https://code.claude.com/docs/en/costs), re-verified 2026-10-21) [OFFICIAL].

| Plan | Share of weekly limit a typical dev uses | Value multiple for a typical dev |
|---|---|---|
| Pro | ~13–34% | **7.5–12.5x** |
| Max 5x | ~2.6–4.4% | **1.5–2.5x** |
| Max 20x | ~1.3–3.5% | **0.75–1.25x** (about break-even vs API) |

Caveat: Max buyers self-select as heavy users. Reddit Max 20x users self-reported ~$4k/mo in March 2026 ([r/ClaudeAI snapshot](https://reddit.sentinel-team.org/posts/1uhj3ab/snapshots/2026-07-03T03%3A00%3A16.73148Z)) [ANECDOTAL].

---

## 1. Claude: notes and verification

- **[OFFICIAL] Multiplier wording** (re-fetched 2026-10-21): Max 5x "includes five times the Pro plan's per-session usage allowance"; Max 20x "20 times".
  - Sessions reset every 5 hours.
  - "Max plans also have a weekly usage limit that applies across all models."
  - Anthropic "may limit your usage in other ways, such as weekly and monthly caps".
  - The Claude Code help article adds: "Max plans also have a separate weekly limit for Fable" ([11145838](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)).
  - SemiAnalysis and growthcab say Fable can use at most 50% of the weekly limit.
- **[OFFICIAL] Promo dates. CONTRADICTS 02.**
  - 02 says the +50% weekly promo ran 2026-07-18 → 09-13.
  - The Anthropic help article says: "From May 13, 2026 through September 13, 2026, your weekly usage limit in Claude Code was 50% higher". From 2026-09-14, "weekly limits in Claude Code are 25% higher than they were before the promotion" ([support.claude.com/en/articles/15910845](https://support.claude.com/en/articles/15910845), updated 2026-09-14).
  - The promo was extended four times: original end 07-13, then 07-19, 08-19, 08-31 and 09-13 ([aicatchup](https://aicatchup.com/news/claude-code-weekly-limits-permanent-25-percent-september-2026)).
  - So the +25% / −17% change is now **[OFFICIAL]**, not just an X post.
  - **Consequence:** SemiAnalysis's June figure, the Classmethod August test, ml0x (Jul–Aug), delphipraxis (July) and finopsllm's August Max 20x month were **all measured during the +50% promo**.
- **[OFFICIAL via press] Opus 5.5 launch, 2026-09-22.**
  - 5-hour limits were raised on Pro, Max and Team.
  - A one-time saveable "rate limit reset" expires 2026-10-22 ([pasqualepillitteri](https://pasqualepillitteri.it/en/news/17905/claude-free-usage-limit-reset-opus-5-5)).
  - SemiAnalysis measured Opus limits about +20% on Max and about +50% on Pro.
  - wokey: Opus 5.5 uses about 0.6x the limit per token of other Opus and Fable models.
- **Max 5x has no large-sample measurement yet.**
  - wokey has 1 account and will publish at 5.
  - The best figures are SemiAnalysis (theoretical $5,725) and three small or anecdotal measurements of $4.3–5.4k/mo.
  - Older botfarm (Feb 2026, Opus 4.6, before the May doubling and before the promo): $523/wk ≈ $2,250/mo (~22x). This is now stale.
- **wokey Max 20x weekly trend:** $1,404 (09-24), $1,510 (10-01), $1,727 (10-08), $1,751 (10-12), $1,643 (10-19). All weeks are post-promo. Changes under ~10% are called noise.
- **Gap between wokey and SemiAnalysis (36x vs 59x):**
  - Real traffic uses mixed models, including Fable, which drains the meter about 2x faster per dollar (Classmethod; [stealwhatworks](https://stealwhatworks.com/blogs/news/claude-max-20x-really-20x)).
  - wokey's traffic is 84–90% cache reads; SemiAnalysis assumes 96.6%.
  - SemiAnalysis also found one of three identical accounts about 20% lower (possible A/B test).
  - For on-screen use, show **~$7k measured / ~$12k theoretical** for Max 20x.

## 2. ChatGPT / Codex: notes and verification

- **Does OpenAI still call Pro "20x Plus"? No, except for grandfathered $200 subscribers through 2026-10-29.**
  - **[OFFICIAL] Pricing page** ([learn.chatgpt.com/docs/pricing](https://learn.chatgpt.com/docs/pricing), fetched 2026-10-21):
    - Lists "Plans at $100, $200, or $500 USD per month".
    - Says "Pro plans currently have no five-hour limit" and "Weekly limits may also apply".
    - Prints **no multiplier**.
  - **[OFFICIAL, OpenAI staff on X] Thibault Sottiaux** (Codex lead): Plus 1x, Pro 100 5x, Pro 200 **10x** (was 20x). He said the new Pro 200 "will net out at half the dollar in API spend compared to the old Pro $200 plan" ([winbuzzer 2026-09-30](https://winbuzzer.com/2026/09/30/openai-adds-500-chatgpt-pro-cuts-allowance-new-200-subscribers-a005-xcxwbn/), [kingy.ai](https://kingy.ai/news/chatgpt-pro-200-usage-cut/)).
  - **[OFFICIAL, OpenAI DevDay X post, quoted]** "Pro 500, a new plan with our highest usage limits (25x Plus)" ([vallettasoftware](https://vallettasoftware.com/blog/post/chatgpt-pro-max)).
  - **Help Center** "About ChatGPT Pro tiers" returned HTTP 403 to me. Third parties say it prints no multiples.
  - **[OFFICIAL email, via press] Grandfathering and compensation.**
    - Pro 200 subscribers active between 09-22 and 09-29 10:00 PT keep 20x through **2026-10-29**, then drop to 10x on 10-30.
    - GPT-6 Pro chat messages drop from 200 to 100 per week.
    - A one-time grant of 62,500 credits (valued at $2,500) expires 2026-12-31 ([hwbusters](https://hwbusters.com/news/openai-cuts-chatgpt-pro-200-in-half-its-time-to-push-back/), [growthcab](https://www.growthcab.com/chatgpt-pro-subscription-pause)).
  - **Consequence:** OpenAI tiers are now linear in price, at about $20 per "Plus unit". SemiAnalysis: "Pro 100, 200 and 500 now give the same tokens per dollar on every model."
- **Measured Pro 100 is ~2.6x Plus, not 5x** (finopsllm, 1 user).
  - This conflicts with SemiAnalysis's 5.0x ($1,055 / $211).
  - Possible causes: the user's Pro windows were more cache-heavy, the gauge may not track API price, and it is one account.
  - Low confidence. Show it only as "one heavy user measured".
- **No post-cut measurement of the new Pro 200 exists yet.** The 10x applies to new buyers since 09-29 and to everyone from 10-30.

## 3. Google AI Pro / Ultra (Antigravity)

**Nothing measured since 02.**
- No vendor or third party publishes absolute quotas or API-$ values.
- Third-party guides say quotas refresh every 5 hours under a weekly ceiling, with Ultra 5x ($99.99) and Ultra 20x ($199.99) sized as multiples of an unquantified Pro baseline ([datastudios](https://www.datastudios.org/post/is-google-antigravity-free-to-use-pricing-limits-and-what-developers-should-expect), [cloudzero](https://www.cloudzero.com/blog/google-antigravity-pricing/)).
- Third-party models inside Antigravity (Claude, GPT) have separate, small fixed limits. One Ultra 20x user reports ~20% of the weekly Claude/GPT quota gone in about an hour ([discuss.ai.google.dev, July 2026](https://discuss.ai.google.dev/t/google-ai-ultra-max-20x-quota-issue-20-weekly-limit-gone-in-one-hour/174110)) [ANECDOTAL].
- **Keep 02's "~10–15x [DERIVED], low confidence" and do not put a Google number on screen as measured.**

## 4. Chinese coding plans: changes since 02

- **SemiAnalysis (Oct 2026):** Chinese plans average "a little under" the ~12x per dollar OpenAI offers [MEASURED-3P, secondary].
  - This **undercuts 02's derived ceilings** for Qwen (20–70x) and MiniMax (13–26x), which are theoretical full-quota extrapolations.
  - For on-screen use, say **"roughly 5–12x"** for Chinese plans.
- **MiniMax: CHANGED, 02 is outdated.**
  - The Token Plan was replaced by **M Plan** (around 2026-10-01 to 10-06). New Token Plan sign-ups are closed; existing auto-renewals keep it.
  - M Plan tiers: Go / Explore / Build at **1x / 3x / 7.5x** usage relative to Go [OFFICIAL multiples] ([platform.minimax.io/docs/m-plan/intro](https://platform.minimax.io/docs/m-plan/intro)).
  - Prices: **$22 / $55 / $132** per month [3P, [tokenplans.dev](https://tokenplans.dev/providers/minimax/), verified 2026-10-21].
  - No absolute quota is published.
  - The previous Token Plan (Plus $20 / Max $50 / Ultra $120, ~1.7B / 5.1B / 12.5B M3 tokens per month) is listed by [codingplan.org](https://codingplan.org/en/plans/minimax) (2026-09-24) [3P].
  - At ~$0.09 per MTok blended (M3 $0.30 in / $1.20 out, ~90% cache, cache price assumed), that is ~**8–10x** [DERIVED, low confidence].
  - 02's "$10 / $20 / $50, 100 / 300 / 1,000 prompts" table describes retired tiers.
- **Alibaba (Qwen) Coding Plan.**
  - Pro is unchanged at ¥200/mo with 6,000 / 45,000 / 90,000 requests per 5h / week / month.
  - The official page now also shows **¥39.90 for the first month** for new customers [OFFICIAL] ([help.aliyun.com](https://help.aliyun.com/zh/model-studio/coding-plan)).
  - An aggregator lists a new "百炼 Token Plan" (¥9.9 first month, then ¥39, 11,500 credits/month) [3P, unverified] ([coding.mcppla.net](https://coding.mcppla.net/), 2026-10-16).
- **Z.ai GLM.**
  - The official docs are unchanged (credits 2,000/10,000, 12,000/60,000, 28,000/140,000) ([docs.z.ai/devpack/overview](https://docs.z.ai/devpack/overview), re-fetched 2026-10-21).
  - Third-party prices: Lite $18, Pro $80, Max $168.
  - A third-party claim of an allowance cut on 2026-10-15 could **not** be verified.
  - Z.ai gave every subscriber a one-time "Reset Card" on 2026-09-01 ([runtimewire](https://runtimewire.com/article/zai-glm-coding-plan-anniversary-reset-card)) [3P].
- **Kimi.**
  - Reported 2026-09-18 restructure: Go / Plus / Pro / Max at ¥468 / ¥948 / ¥1,908 / ¥6,708 per year. Go excludes Kimi Code ([KuCoin news](https://www.kucoin.com/news/flash/kimi-launches-new-subscription-tiers-after-two-month-pause-kimi-code-not-sold-separately)) [3P].
  - The official USD help page still shows $19 / $39 / $99 / $199 at 1x / 5x / 15x / 30x (page date unknown).
  - Still no absolute quota, so no multiplier.

---

## 5. Conflicts with 02-subscriptions.md

| # | 02 says | Re-check finds | Severity |
|---|---|---|---|
| 1 | +50% weekly promo ran 2026-07-18 → 09-13 | **2026-05-13 → 09-13** [OFFICIAL, support article 15910845] | High: affects which data points are promo-inflated (SemiAnalysis June, Classmethod Aug, ml0x, delphipraxis, finopsllm Aug) |
| 2 | Break-even ≈ 18% of weekly limit | 18% is against wokey's discounted gateway. Against the **API list price, break-even is ~1.7–2.8%** | High if shown on screen |
| 3 | Sep 14 +25% change rests on an X post [3P] | Now confirmed [OFFICIAL] | Upgrade the label |
| 4 | Max 5x ~57x "theoretical" only | Small measurements now exist ($4.3–5.4k/mo, 43–54x). The weekly ratio **Max 20x ≈ 2x Max 5x and Max 5x ≈ 4.9x Pro** follows from SemiAnalysis | Extension |
| 5 | Pro 200 "about 10x Plus" from subscriber emails | Now attributed to OpenAI's Codex lead (X post) and OpenAI's email. Pro 500 = **25x** per OpenAI's DevDay post. Cut takes effect **10-30** for grandfathered users | Upgrade the label |
| 6 | MiniMax Starter $10 / Plus $20 / Max $50 | Retired; replaced by **M Plan $22 / $55 / $132** (1x / 3x / 7.5x) | Medium |
| 7 | Qwen 20–70x, MiniMax 13–26x [DERIVED] | SemiAnalysis: Chinese plans average **under ~12x** | Medium: use the lower figure on screen |
| 8 | (missing) | June 2026 SemiAnalysis: **ChatGPT Pro ~$14k (70x) > Claude Max ~$8k (40x)**; reversed by October | Important context for the Claude-vs-GPT segment |

## 6. Confidence

- **High:**
  - The per-session vs weekly distinction [OFFICIAL wording].
  - Max 20x weekly ≈ 10x Pro (wokey and SemiAnalysis agree independently: 9.7x and 10.0x).
  - OpenAI's linear 5x / 10x / 25x tiers (OpenAI staff and OpenAI posts).
  - Promo dates.
- **Medium:**
  - SemiAnalysis absolute dollar figures. The report is paywalled; two secondary sources (explainx, orcarouter) agree exactly.
  - wokey's medians. It has a commercial interest, but the method is stated and n=474 / 17.
- **Low:**
  - All Max 5x measurements (n ≤ 3).
  - All ChatGPT measured values (finopsllm, 1 user).
  - Per-task efficiency ratios (vendor charts and blog benchmarks).
  - Google.
  - Chinese plan multipliers.
- **Model names:** GPT-6.1 Sol, GPT-6 Astra, Opus 5.5 and Fable 5.1 are used consistently across sources.
