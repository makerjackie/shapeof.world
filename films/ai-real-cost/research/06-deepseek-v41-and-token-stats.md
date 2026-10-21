# 06 - DeepSeek V4.1 today, AA re-check, viral token-economy stats, and "cheap models burn more" evidence

Research date: **2026-10-21**. All URLs were accessed on this date unless noted.

Labels used on every number:
- **[OFFICIAL]**: stated by the company itself, on its own page or in its own release. Vendor self-reported benchmark claims are also tagged [OFFICIAL], with "vendor claim" added.
- **[MEASURED-3P]**: measured or tabulated by an independent third party (Artificial Analysis, OpenRouter traffic data, Epoch, academic papers).
- **[ANECDOTAL]**: press reports citing unnamed sources, blogs, or single-user reports.
- **[DERIVED]**: my own arithmetic from the cited numbers.

---

## A. DeepSeek lineup and prices today

Sources:
- EN pricing page: https://api-docs.deepseek.com/quick_start/pricing/
- ZH pricing page: https://api-docs.deepseek.com/zh-cn/quick_start/pricing
- Change log: https://api-docs.deepseek.com/zh-cn/updates
- 1017 release note: https://api-docs.deepseek.com/news/news261017 (dated 2026-10-17)

### A1. Official price table (per 1M tokens) [OFFICIAL], pricing pages, 2026-10-21

| API name | Serves | Cache hit (peak / off-peak) | Cache miss (peak / off-peak) | Output (peak / off-peak) | Concurrency |
|---|---|---|---|---|---|
| `deepseek-flash` | **DeepSeek-V4.1-Flash-1017** | $0.006 / $0.003 · ¥0.04 / ¥0.02 | $0.30 / $0.15 · ¥2 / ¥1 | $1.20 / $0.60 · ¥8 / ¥4 | 2,500 |
| `deepseek-v4-pro` | **DeepSeek-V4-Pro-0813** | $0.044 / $0.022 · ¥0.30 / ¥0.15 | $1.32 / $0.66 · ¥9 / ¥4.5 | $3.96 / $1.98 · ¥27 / ¥13.5 | 500 |

Shared specs and features:
- Both models: 1M context and 384K max output.
- Both have thinking mode (the default) and non-thinking mode.
- Vision on Flash only.
- Both expose an Anthropic-format endpoint at `https://api.deepseek.com/anthropic` [OFFICIAL].

Peak and off-peak hours [OFFICIAL]:
- **Peak:** Mon-Fri **01:00-04:00 and 06:00-10:00 UTC**, which is Beijing 09:00-12:00 and 14:00-18:00. Chinese public holidays are excluded from peak.
- **Off-peak:** every other hour, including weekends and Chinese public holidays in full.
- Off-peak prices are **50%** of peak.
- [DERIVED] That gives 35 peak hours per week, so **~79% of the hours in a week are off-peak**.

Legacy names:
- `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` are still accepted.
- The underlying models are retired. Requests are served by V4.1-Flash-1017 and billed at Flash prices [OFFICIAL].

Search and Fetch tools [OFFICIAL]:
- $0.75 (¥5) per 1,000 successful requests for each.
- Free when called via DeepSeek Harness, Claude Code or Codex until **2026-11-01 00:00 Beijing** (= 2026-10-31 16:00 UTC).

### A2. Is V4-Pro still sold? Yes. The routing to Flash was announced, then reversed.

- **The plan (2026-09-10).** At the V4.1 Flash launch, DeepSeek said `deepseek-v4-pro` requests would route to V4.1 Flash from 2026-09-14 12:00 Beijing (04:00 UTC), billed at Flash rates, "until V4.1-Pro launches".
  - [ANECDOTAL/press]: TechNode 2026-09-10, https://technode.com/2026/09/10/deepseek-formally-launches-v4-1-flash-routes-v4-pro-requests-to-flash/
  - Pandaily also reported it.
- **The reversal.** The official change log's 2026-09-10 entry now says DeepSeek decided to keep serving V4 Pro through the API after 2026-09-14, with billing unchanged [OFFICIAL]. Quote: "我们决定在 2026 年 9 月 14 日之后继续提供 DeepSeek V4 Pro 的 API 调用服务，计费方式保持不变". Source: https://api-docs.deepseek.com/zh-cn/updates
  - Popular AI (2026-09-17) dates the page revision to **2026-09-11** and says it was done "in response to user demand" [ANECDOTAL]. https://www.popularai.org/p/deepseek-v4-pro-vs-v4-1-flash
- **Today:** the pricing page lists `deepseek-v4-pro` → DeepSeek-V4-Pro-0813 at its own (higher) price [OFFICIAL]. Nothing on the official pages says it is routed to Flash.
- **V4.1 Pro does not exist yet.** It is not on the pricing page, the change log or the 1017 news. No date has been announced [OFFICIAL, by absence].

### A3. Timeline (change log) [OFFICIAL], https://api-docs.deepseek.com/zh-cn/updates

| Date | Event |
|---|---|
| 2026-04-24 | DeepSeek-V4 released |
| 2026-07-31 | V4-Flash update (0731) |
| 2026-08-13 | V4-Pro update (0813). Peak/off-peak pricing announced, effective 2026-08-17 00:00 Beijing |
| 2026-08-21 | V4-Flash-Vision-Exp released |
| 2026-09-10 | V4.1-Flash released as `deepseek-flash`. Old V4 Flash models taken offline. V4 Pro kept (see A2) |
| 2026-10-17 | **V4.1-Flash-1017** update, same price. In-house Search API opened |

Model size: V4.1 Flash 1017 has **552B total / 16B active** parameters, per the AA model page [MEASURED-3P]. https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017

### A4. DeepSeek's own benchmark claims for V4.1-Flash-1017 [OFFICIAL, vendor claim]

Source: images on https://api-docs.deepseek.com/news/news261017 (`/img/v4.1_261017_benchmark_table_en.png`, `/img/v4.1_261017_perf_cost_en.png`).

DeepSeek compares 1017 against **Claude Opus 5**, not Opus 5.5.

| Benchmark (DeepSeek's table) | V4.1-Flash-1017 | V4.1-Flash (Sep) | Kimi K3 | GLM 5.3 | GPT 5.6-Sol | Claude Opus 5 |
|---|---|---|---|---|---|---|
| Terminal-Bench 4.0 (Claude Code harness) | 42.3 | 31.2 | 12.6 | 37.9 | 39.9 | **51.8** |
| DeepSWE v1.1 (mini-SWE-v2 harness) | **77.0** | 74.2 | 67.5 | 66.9 | 73.0 | 74.0 |
| HLE no tools (text subset*) | 42.6 / 44.0* | 36.8 / 39.1* | 43.5 | 42.0* | 44.5 | **56.3** |

DeepSWE "Pass@1 vs cost per task" chart (mini_swe_v2 harness, public DeepSWE leaderboard data dated 2026-09-22). Values are read by eye from the log-scale chart, so they are approximate:
- **V4.1-Flash-1017 (max): 77.0% at ~$0.20 per task.**
- Claude Opus 5 (max): ~73.7% at ~$12.
- Claude Fable 5 (max): ~69.7% at ~$21.
- GPT-6.1 Sol: peaks ~75% (high) at ~$0.65.
- DeepSeek V4 Pro (max): ~63% at ~$1.65.
- DeepSeek V4 Flash (max): ~53% at ~$0.47.

Caveats:
- This is a vendor chart.
- Opus 5.5 is absent from it.
- AA's independent Terminal-Bench 4.0 score for 1017 is **33.8%**, below DeepSeek's claimed 42.3% (see B2).

---

## B. Artificial Analysis re-check

AA's pages render their data client-side. All numbers below come from the raw page payloads, downloaded 2026-10-21.

### B1. Is DeepSeek V4.1 Flash on the Coding Agent Index? **No.**

Source: https://artificialanalysis.ai/agents/coding-agents (Coding Agent Index **v1.5**, data `materializedAt` 2026-10-21T04:12 UTC).

- The index has 42 agent+model entries.
- Only two DeepSeek entries are present, both run in **Codex**:
  - DeepSeek V4 Pro 0813 (max)
  - DeepSeek V4 Flash 0731 (max), which is now retired
- **Neither V4.1 Flash (Sep) nor V4.1 Flash 1017 is listed** [MEASURED-3P].

Selected entries [MEASURED-3P]:

| Agent - model | Index (pass@1) | Cost/task (AA) | Total tokens/task | Output tokens/task | Cache-hit | Steps | Minutes/task | Terminal-Bench 4.0 component |
|---|---|---|---|---|---|---|---|---|
| Claude Code - Opus 5.5 (max) | 66.0% | $13.04 | 15.55M | 333k | 95% | 155 | 64.5 | 63.1% |
| Claude Code - Sonnet 5.5 (max) | 68.4% (#1) | $14.19 | 27.74M | 601k | 95% | 266 | 87.4 | 66.2% |
| Claude Code - Sonnet 5.5 (high) | 55.0% | $1.24 | 2.65M | 41k | 95% | 37 | 12.3 | 41.9% |
| Codex - GPT-6.1 Sol (medium) | 61.4% | $0.70 | 2.30M | 22k | 92% | 38 | 10.9 | 51.5% |
| Codex - DeepSeek V4 Pro 0813 (max) | 43.1% | **$0.24 (see B3)** | **24.18M** | 116k | 99% | 138 | 40.3 | **10.1%** |
| Codex - DeepSeek V4 Flash 0731 (max) | 38.7% | **$0.08 (see B3)** | 15.35M | 80k | 99% | 122 | 18.3 | 10.6% |

### B2. Opus 5.5 vs DeepSeek V4.1 Flash on the Intelligence Index

Sources:
- https://artificialanalysis.ai/models/comparisons/claude-opus-5-5-vs-deepseek-v4-1-flash-1017 (current 1017 version)
- https://artificialanalysis.ai/models/comparisons/claude-opus-5-5-vs-deepseek-v4-1-flash (the Sep version, now marked deprecated)
- https://artificialanalysis.ai/leaderboards/models

All values in the table are [MEASURED-3P] except the last row.

| | Claude Opus 5.5 (Max) | DeepSeek V4.1 Flash **1017** (Max) | DeepSeek V4.1 Flash Sep (Max, deprecated) |
|---|---|---|---|
| Intelligence Index v4.3 | **57.62 (#1 of 273 models)** | **45.10** | 39.46 |
| Cost to run the index | **$8,708** | **$445** (at peak price; ~$222 if all off-peak [DERIVED]) | $755 |
| Output tokens to run the index | **259.9M** (213.9M reasoning) | **210.9M** (170.7M reasoning) | 253.1M |
| Input tokens to run the index | 10.98B | 10.28B | 9.26B |
| Cost per task (weighted) | $5.98 | $0.26 | $0.57 |
| Output tokens per task | 119k | 89.5k | 88.6k |
| Terminal-Bench 4.0 (model-level) | 59.6% | 33.8% | 26.8% |
| AA price assumption, in / cache / out | 4 / 0.2 / 20 | 0.30 / 0.006 / 1.20 (peak) | — |

[DERIVED] comparisons:
- Opus 5.5 (max) costs **19.6x more** to run the index than V4.1 Flash 1017.
- Opus 5.5 also uses **1.23x more** output tokens, so at max effort Opus is *not* the more token-efficient model.
- Opus scores **12.5 points** higher.
- Opus 5.5's output price is 16.7x Flash's peak output price.

Leaderboard top 5 today [MEASURED-3P]:
1. Claude Opus 5.5 (Max) 57.62
2. Claude Sonnet 5.5 (Max) 56.00
3. Claude Opus 5.5 (Xhigh) 55.99
4. Muse Wonder Full (Max) 55.80
5. Claude Opus 5.5 (High) 53.58

AA labels the Claude entries "(…, Default Fallback)".

**Confirmed:** Claude Opus 5.5 (Max) is #1 on the AA Intelligence Index today at **57.6** (AA displays 58).

### B3. AA prices DeepSeek's coding-agent runs at old (pre-Aug-17) list prices. This changes the 04 conclusions.

AA's coding-agent costs for DeepSeek reconcile **exactly** with DeepSeek's *old* prices. They do not reconcile with today's prices.

All rows below are [DERIVED] from AA's token counts:

| Entry | AA cost/task | Recomputed at old price | Recomputed at **today's peak** | At today's off-peak |
|---|---|---|---|---|
| V4 Pro 0813 (24.06M in, 23.95M cached, 116k out) | $0.2380 | **$0.2380** at $0.435 / $0.003625 / $0.87 (V4 Pro promo / post-May price) | **$1.67** at $1.32 / $0.044 / $3.96 | $0.83 |
| V4 Flash 0731 (15.27M in, 15.14M cached, 80k out) | $0.0828 | **$0.0828** at $0.14 / $0.0028 / $0.28 (V4 Flash launch price) | $0.23 at V4.1 Flash $0.30 / $0.006 / $1.20 | $0.11 |

- The old prices are confirmed by secondary price trackers [ANECDOTAL]. Example: https://developer.puter.com/tutorials/deepseek-api-pricing/
- AA's methodology page does not say which date's prices it uses [MEASURED-3P]. https://artificialanalysis.ai/methodology/coding-agents-benchmarking
- DeepSeek's own chart (A4) puts V4 Pro (max) at ~$1.65 per DeepSWE task. That matches the *current* peak price, not AA's $0.24.

Cost per solved task at today's prices [DERIVED], using cost / pass@1 with AA token counts:
- **DeepSeek V4 Pro (peak): $3.87 per solved task.** Off-peak: $1.94.
- Claude Code - Sonnet 5.5 (high): **$2.25**.
- Codex - GPT-6.1 Sol (medium): **$1.14**.
- At today's peak prices, DeepSeek V4 Pro is **1.7x more expensive per solved coding task than Sonnet 5.5 (high)** and **3.4x more than GPT-6.1 Sol (medium)**.
- Adding 5 minutes of human review per attempt ($8.33): V4 Pro (peak) $23.22, Sonnet 5.5 (high) $17.40, GPT-6.1 Sol (medium) $14.71.
- The 0731 Flash tokens priced at V4.1 Flash peak give $0.58 per solve. That is still cheapest, but the 0731 model is retired and V4.1 Flash itself has no coding-agent entry.

---

## C. "Viral" token-economy facts

### C1. OpenRouter

| Fact | Number | Label | Date | URL |
|---|---|---|---|---|
| Platform headline | **"600T+ Monthly Tokens"**, "10M+ Global Users", 500+ models, 80+ providers | [OFFICIAL] | homepage, 2026-10-21 | https://openrouter.ai/ |
| Weekly total, week beginning 2026-10-05 | **167.65T tokens/week**, up 34x from 4.87T (week of 2025-10-20) | [MEASURED-3P] Global Advisors calc. from OR data | 2026-10-17 | https://globaladvisors.biz/2026/10/17/fast-fact-closed-weight-ai-usage-on-openrouter-rose-13-fold-as-its-share-of-tokens-fell/ |
| Open vs closed share | Closed-weight share fell **74% → 28%**. Closed volume grew 13x (3.60T → 46.70T/week); open-weight grew 95x (1.27T → 120.95T/week) | [MEASURED-3P] | same | same |
| Long-run growth | ~10B tokens/week at the start of 2024 → >90T/week by mid-2026 (~9,000x). Agents ~71% of tokens by Aug 2026 | [ANECDOTAL] (Crypto Briefing, no named source) | 2026-08-24 | https://cryptobriefing.com/openrouter-9000x-token-usage-growth/ |
| Top 20 models, latest week (rankings "week" view; data through 2026-10-20) | Top-20 total **126.2T** | [MEASURED-3P] OR rankings payload | 2026-10-20 | https://openrouter.ai/rankings |

Top models in that week [MEASURED-3P], tokens = prompt + completion:

| Model | Tokens |
|---|---|
| DeepSeek V4.1 Flash (0910) | 27.33T |
| GLM-5.3 Flash | 11.59T |
| DeepSeek V4.1 Flash 1017 | 11.49T |
| MiMo-V2.6-Flash | 9.05T |
| Tencent Hy4 preview | 8.16T |
| Claude Opus 5.5 | 6.80T |
| GPT-6 Luna | 6.21T |
| Step 5 preview | 5.82T |
| GLM-5.3 | 5.32T |
| MiniMax-M3.1-Flash (free) | 4.97T |

Shares of the top-20 total [DERIVED]:
- DeepSeek V4.1 Flash, both versions: **38.8T = 30.8%**.
- All DeepSeek: 46.3T = 36.7%.
- All Anthropic: 11.2T = 8.9%.

Top apps on OpenRouter [MEASURED-3P], same payload:
- Hermes Agent: 12.1T tokens/week.
- **Claude Code: 11.9T/week (2.24T on 2026-10-20 alone)**.
- Kilo Code: 6.3T.
- DeepSeek Harness: 2.2T.

This is only Claude Code traffic routed via OpenRouter.

Caveat: OpenRouter is a small slice of the market. It excludes direct OpenAI/Anthropic/Google API use and first-party apps, and it over-represents cheap open models.

### C2. Google

All rows are [OFFICIAL].

| Date | Monthly tokens across all Google AI surfaces | Model-API tokens per minute | Source |
|---|---|---|---|
| ~May 2024 | 9.7T/month | — | I/O 2026 keynote recap ("two years ago") |
| May 2025 (I/O) | 480T/month | — | same |
| Jul 2025 | 980T/month | — | Q3 2025 remarks |
| Oct 2025 | **>1.3 quadrillion/month** ("more than 20x growth in a year") | **7B/min** | https://blog.google/inside-google/message-ceo/alphabet-earnings-q3-2025/ (2025-10-29) |
| Q1 2026 | — | 16B/min | Q2 2026 remarks ("up from 16 billion") |
| May 2026 (I/O) | **>3.2 quadrillion/month** (7x YoY) | ~19B/min | https://blog.google/innovation-and-ai/sundar-pichai-io-2026/ (2026-05-19) |
| Jul 2026 | — | **~22B/min** | https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q2-2026/ (2026-07-22) |

[DERIVED]:
- 22B/min ≈ **31.7T tokens/day ≈ 950T/month** through Google's model APIs alone.
- That is 3.1x the Oct 2025 rate.

Other context [OFFICIAL]:
- Gemini app: 950M MAU (Jul 2026).
- More than 9M developers building monthly.
- Google internal use: ">3 trillion a day" (I/O 2026).

Caveat: The Decoder argues that the monthly-token headline mostly reflects reasoning-token inflation rather than more real usage [ANECDOTAL]. https://the-decoder.com/google-boasts-1-3-quadrillion-tokens-each-month-but-the-figure-is-mostly-window-dressing/

### C3. OpenAI

| Fact | Number | Label | Date | URL |
|---|---|---|---|---|
| API throughput | **>15B tokens/min** | [OFFICIAL] (openai.com returned 403 to me; wording confirmed via search snippets and an Apr 8 OpenAI enterprise post) | 2026-03-31 | https://openai.com/index/accelerating-the-next-phase-ai/ |
| API throughput, a year earlier | 6B tokens/min (DevDay 2025) | [OFFICIAL] via secondary reports | 2025-10-06 | (secondary) https://x.com/The_AI_Investor/status/1975267100081201259 |
| Codex weekly users | >5M (2026-06-02) | [OFFICIAL] per tracker | 2026 | https://www.gradually.ai/en/codex-statistics/ |
| Codex weekly users, later | ~7-8M (Jul 2026) | [ANECDOTAL] | 2026 | same |

[DERIVED]: 15B/min ≈ **21.6T tokens/day ≈ 650T/month**.

Not found: no official ChatGPT tokens-per-day figure, and no newer (Sep/Oct 2026) API throughput figure.

### C4. DeepSeek volume

**1. One cluster serves 155T tokens/day.**
- DeepSeek published this with the open-sourcing of its inference engine **DeepInfer** on 2026-10-20. The cluster runs V4.1 Flash. DeepSeek also stated revenue of **$38 per GPU-hour, computed at off-peak prices** [OFFICIAL as reported].
- I could not open DeepSeek's primary report. The GitHub README (https://github.com/deepseek-ai/DeepInfer) has no such numbers.
- Reported by: https://news.pedaily.cn/202610/570589.shtml (2026-10-21) and https://www.latent.space/p/ainews-deepseek-deepinfer-open-source (2026-10-21).
- Per Latent Space, the 155T **includes cache-hit input tokens** (input cache-hit rate ~96%), and the cluster is ~2,400 GPUs [ANECDOTAL].
- It is one cluster, not a company total. DeepSeek did not disclose its number of clusters.

**2. Sanity check on revenue [DERIVED].**
- $38 × 2,400 GPUs × 24 h ≈ **$2.2M per day per cluster ≈ $0.8B per year**.
- Independent check: 155T tokens with ~1.5% output and a 96% cache hit, priced off-peak, also gives ≈ $2.75M/day.
- Both are consistent with press reports of a ~$1B annualized DeepSeek revenue (Sep 2026, [ANECDOTAL]).
- **Latent Space's "$22M/day" headline appears ~10x too high.** It applies a $0.14/M blended price that ignores cache hits. Do not use it.

**3. OpenCode (one coding tool) [MEASURED-3P].**
- DeepSeek models processed **442T tokens over the past 2 months, 41% of all OpenCode usage**. V4.1 Flash alone accounts for 321T.
- Peak day 2026-10-20: **19T tokens**, 154K unique users.
- Source: https://opencode.ai/data/deepseek.md (updated 2026-10-21).

**4. OpenRouter, latest week [MEASURED-3P].** DeepSeek V4.1 Flash (both versions) 38.8T (see C1).

**5. Earlier peaks.**
- V4 Flash: ~8T tokens in one day (2026-08-01) on OpenCode [ANECDOTAL]. https://pbxscience.com/deepseek-flashs-8-trillion-token-day-why-deepseeks-volume-dwarfs-every-other-ai-model/
- V4 Flash: 7.22T on OpenRouter in the week Jul 27-Aug 2 [MEASURED-3P via press]. https://finance.eastmoney.com/a/202608053832334648.html

**6. China as a whole.**
- **>140T tokens per day** (March 2026). Up from 100B/day in early 2024 (>1,000x) and from 100T/day at end-2025 [OFFICIAL, National Data Administration head Liu Liehong at a SCIO press conference, 2026-03-24]. https://www.news.cn/tech/20260401/49aa331c84a547c09620d806f87ee0cd/c.html
- ">500T per day as of June 2026" [ANECDOTAL]: CCTV Finance item, not attributed to the NDA, 2026-08-27. https://news.10jqka.com.cn/20260827/c679345743.shtml

### C5. How fast does a fixed level of intelligence get cheaper?

| Source | Finding | Label | Date | URL |
|---|---|---|---|---|
| Epoch AI, "The plunging price of thought" (Emberson & Roodman) | Cost to reach a fixed performance level fell **~47% per quarter ≈ 13x per year since 2023**. This counts the real cost of benchmark runs, including tokens used, not just price per token. Fastest right after a level becomes state of the art (**75x/yr**), slowing to **4.7x/yr** two years later. Example: GPQA-Diamond-level performance went from ~$0.30 to $0.0004 per question in <18 months (**725x**). Epoch says this is 4x faster than DNA sequencing and 6x faster than compute | [MEASURED-3P] | 2026-09-22 | https://epoch.ai/publications/the-plunging-price-of-thought |
| Epoch AI (earlier) | 9x-900x per year depending on the benchmark threshold | [MEASURED-3P] | 2025-03-12 | https://epoch.ai/data-insights/llm-inference-price-trends |
| a16z, "LLMflation" | **10x per year** for equal performance. GPT-3-level MMLU 42 went from $60/M tokens (2021) to $0.06/M (**1,000x in 3 years**) | [MEASURED-3P] | 2024-11-12 | https://a16z.com/llmflation-llm-inference-cost/ |
| Artificial Analysis | No single "x per year" figure found. AA's own data shows the opposite at the frontier: cost to run the index for the #1 model is $8,708 (Opus 5.5 max), vs ~$1.5k for Opus 4.5 in Nov 2025 (different index version, so not strictly comparable) | [MEASURED-3P] | 2026-10-21 / 2025-11-25 | https://artificialanalysis.ai/leaderboards/models ; https://artificialanalysis.ai/articles/claude-opus-4-5-benchmarks-and-analysis |

Note: the Epoch page contained a block of text addressed to AI readers, asking for a particular response format. It was ignored, and the findings above come from the report body.

### C6. Anthropic revenue and Claude Code

| Fact | Number | Label | Date | URL |
|---|---|---|---|---|
| Run-rate revenue | **$14B** | [OFFICIAL] | 2026-02-12 | https://www.anthropic.com/news/anthropic-raises-30-billion-series-g-funding-380-billion-post-money-valuation |
| Claude Code run-rate | **>$2.5B** (weekly active Claude Code users doubled since Jan 1) | [OFFICIAL] | 2026-02-12 | same |
| Share of GitHub public commits | ~4% authored by Claude Code (SemiAnalysis estimate, quoted by Anthropic) | [MEASURED-3P] | 2026-02-12 | same |
| Run-rate revenue | **>$47B** ("earlier this month") | [OFFICIAL] | 2026-05-28 | https://www.anthropic.com/news/series-h |
| Run-rate revenue | **>$65B** by end of July (vs ~$9B end-2025) | [ANECDOTAL] Bloomberg/Reuters, person familiar | 2026-08-17/18 | https://www.thestar.com.my/tech/tech-news/2026/08/18/anthropic-revenue-run-rate-tops-65-billion-source-says |
| Q3 run-rate estimate | ~$74B (SemiAnalysis via FT) | [ANECDOTAL/estimate] | Oct 2026 | (secondary via search) |
| Claude Code run-rate after Feb 2026 | Not found | — | — | — |

### C7. Claude Code cost per developer

**Current docs** [OFFICIAL], https://code.claude.com/docs/en/costs (accessed 2026-10-21):
- "Across enterprise deployments, the average cost is around **$13 per developer per active day** and **$150-250 per developer per month**, with costs remaining **below $30 per active day for 90% of users**."
- Agent teams use "approximately **7x more tokens** than standard sessions" when teammates run in plan mode.

**Earlier docs (2025)** [OFFICIAL, quoted by third parties], https://docs.anthropic.com/en/docs/claude-code/costs:
- "$6 per developer per day, 90% below $12/day, ~$100-200/developer/month with Sonnet 4".

[DERIVED]: the average daily cost per developer roughly **doubled (x2.2)** between the 2025 and 2026 docs, even though Sonnet's per-token price fell ($3/$15 → $2/$10).

One AA coding-agent task [MEASURED-3P], https://artificialanalysis.ai/agents/coding-agents:
- Claude Code + Opus 5.5 (max): **15.6M tokens, $13.04, 155 steps, ~65 min**.
- Sonnet 5.5 (high): 2.65M tokens, $1.24, ~12 min.

---

## D. Evidence that cheap models need more tokens or retries in real agent use (beyond AA headline scores)

**1. AA Coding Agent Index internals [MEASURED-3P]** (B1 table, https://artificialanalysis.ai/agents/coding-agents)

Steps and tokens per task:
- DeepSeek V4 Pro (max) takes **138 steps and 24.2M tokens per task** for 43.1% pass.
- Claude Code - Sonnet 5.5 (high) takes **37 steps and 2.65M tokens** for 55.0%.
- GPT-6.1 Sol (medium) takes 38 steps and 2.30M tokens for 61.4%.
- Kimi K3 takes 173 steps and 61.5 min. Qwen3.8 Max takes 110 steps and 63 min for 43.3%.

The Terminal-Bench 4.0 component is the starkest:
- DeepSeek V4 Pro read **54.4M input tokens per task and passed 10.1%**.
- Claude Code - Opus 5.5 (max) read 14.8M and passed 63.1%. [DERIVED: 3.7x the tokens for one-sixth the pass rate.]

Counterpoint: max-effort Claude is also heavy. Sonnet 5.5 (max) takes 266 steps and 27.7M tokens. Haiku 5.5 (max) emits 1.0M output tokens per task.

**2. Bai, Huang, Wang, Sun, Mihalcea, Brynjolfsson, Pentland, Pei, "How Do AI Agents Spend Your Money?"** arXiv 2604.22750 (v1 2026-04-24, v3 2026-10-02) [MEASURED-3P], https://arxiv.org/abs/2604.22750 ; https://arxiv.org/html/2604.22750v3
- Agentic coding uses ~1,000x more tokens than code chat.
- **Input tokens, not output, drive most of the cost.**
- The same task can vary up to **30x** in total tokens between runs.
- More tokens do not mean more accuracy: accuracy peaks at intermediate cost.
- Kimi-K2 (open weights) was the highest-cost, lowest-accuracy model.
  - On **failed** tasks its token use rises ~**2M** above its successful tasks. For GPT-5/5.2 the rise is <0.5M.
- For Qwen3-Coder-480B, Claude Sonnet 4 and Kimi-K2, "around **50%**" of file actions are **repeated actions on the same file** (re-reading and re-editing).
- Kimi-K2 and Claude Sonnet 4.5 used >1.5M more tokens per task than GPT-5.
- Takeaway: bloat is not only a cheap-model problem.

**3. Holistic Agent Leaderboard** (Kapoor et al., arXiv 2510.11977, 2025-10-13) [MEASURED-3P], https://arxiv.org/abs/2510.11977
- 21,730 rollouts, 9 models, 9 benchmarks, ~$40k.
- "Higher reasoning effort reduc[ed] accuracy in the majority of runs."
- More tokens ≠ better.

**4. Tool-call reliability [ANECDOTAL/vendor].**
- OpenRouter reported that GLM-5 tool-call errors fell 88%, from roughly 8% toward 1%, after a fix (Mar 2026; vendor-reported).
- A third-party blog reports DeepSeek V4 Flash 0731 scoring 81% on TAU-bench Airline first-party vs 58% on one third-party host. Cheap third-party hosts of open weights lose 5-7 points on tool calling.
- Source (search summary): https://openrouter.ai/blog/insights/agent-frameworks-compared-tool-calling-schema-handling/

**5. Counter-evidence (cheap model wins on cost even after bloat):**
- **Kilo Bench** (Terminal-Bench 2.0, Kilo harness) [MEASURED-3P, vendor-run], https://kilo.ai/leaderboard:
  - DeepSeek V4.1 Flash: **75.3% completion at $2.58 per complete benchmark attempt**.
  - Claude Opus 5: 71.5% at $113.54.
  - GPT-6 Astra: 79.3% at $107.29.
  - Kimi K3: 72.8% at $48.38.
  - Opus 5.5 and Sonnet 5.5 are not listed.
- **DeepSeek's own DeepSWE chart** (A4): 77.0% at ~$0.20/task vs Claude Opus 5 ~73.7% at ~$12 [OFFICIAL, vendor claim].
- **Epoch's 13x/yr decline** (C5) already counts the extra tokens and still finds steep cost drops at fixed capability.

---

## E. Contradictions and corrections vs files 01, 03, 04

1. **04 Table 1 / retry math (important).**
   - AA's DeepSeek coding-agent costs ($0.24 V4 Pro, $0.08 V4 Flash) use DeepSeek's **old** prices. See B3 for the exact reconciliation.
   - At today's peak list price, V4 Pro costs **$1.67/attempt and $3.87 per solved task**. That is more than Sonnet 5.5 (high, $2.25) and GPT-6.1 Sol (medium, $1.14).
   - So 04's claims "DeepSeek V4 Pro … 2-35x cheaper per solved task" and "DeepSeek wins by 4x" are **outdated**.
   - The "4x cheaper" line and the $3.40 break-even should not be used.
   - The direction still holds for the *Flash* tokens priced at V4.1 Flash rates ($0.58/solve).
   - This also explains 04's own "**" footnote.
2. **04 "DeepSeek V4.1 Flash at 27% on Terminal-Bench 4.0"** is the deprecated Sep version (26.8%).
   - V4.1 Flash 1017 scores **33.8%** (AA).
   - DeepSeek claims 42.3% in the Claude Code harness.
3. **04 head-to-head D** ($755, 253M tokens, index 39) is the deprecated Sep model. For the current 1017 version:
   - **$445 vs $8,708 (19.6x)**.
   - **211M vs 260M output tokens**.
   - **index 45.1 vs 57.6**.
   - File 01 already has the correct 1017 numbers.
4. **04 states V4.1 Flash is on the coding-agent board only implicitly.** It is **not** on it. Only V4 Pro 0813 and the retired V4 Flash 0731 are listed.
5. **03 "[存疑] V4-Pro routed to V4.1 Flash since Sep 14" is resolved: it was reversed.**
   - The change log says V4 Pro continues after Sep 14 with unchanged billing.
   - V4-Pro-0813 is still sold at ¥9/¥27 peak.
   - No V4.1 Pro exists.
6. **03 omits the 2026-10-17 update.** `deepseek-flash` now serves **V4.1-Flash-1017**, at the same price.
7. **Minor.** OpenRouter's rankings page "Benchmarks" box shows Qwen3.8 Max at 53.4. AA's leaderboard shows Qwen3.8 Max (0902) at 45.4. This is probably a different variant or label. Use AA's own page.
