# 04 - Token efficiency and cost per SOLVED task

**Claim tested:** "Cheap per-token models end up costing more per solved task because they use more tokens and need more retries or rework. Smarter models such as Claude Opus and Sonnet use fewer tokens and succeed on the first try."

**Research date:** 2026-10-21. Live Artificial Analysis (AA) data was read from the page payloads on that date. The coding-agent data carries a `materializedAt` stamp of 2026-10-21T04:12 UTC.

---

## TL;DR verdict

**The claim is partly true. As a blanket statement it is false.**

- **TRUE against mid-priced "cheap" models (Qwen, Kimi, GLM, Grok).** On today's AA leaderboards, models with 2-5x lower output prices than Claude often cost **more per task and per solved task**. They burn more tokens (especially uncached input) and solve fewer tasks.
  - Qwen3.8 Max costs $2/$6 per 1M tokens against Opus 5.5 at $4/$20. Qwen spends **$5.41 per Intelligence Index task** (score 45). Opus 5.5 at medium effort spends **$1.34** (score 51). That is 4x the cost for a lower score.
- **TRUE that frontier labs have cut tokens per task sharply.**
  - Opus 4.5 at medium effort matched Sonnet 4.5's best SWE-bench Verified score with **76% fewer output tokens** (Anthropic, Nov 2025).
  - Opus 5.5 at low effort ran the whole AA Intelligence Index on **20M output tokens**. DeepSeek V4 Pro (max) needed **163M**. Opus scored higher and cost less ($860 vs $1,122).
- **FALSE against the genuinely cheap tier (DeepSeek V4 Flash/Pro, GPT-6 Luna, MiMo).** These do burn many more tokens. On AA's coding-agent benchmark, DeepSeek V4 Pro uses **~25x the tokens of Sonnet 5.5 (low)** at the same pass rate. Even so, their per-token prices are so low that they remain **2-35x cheaper per solved task** on raw API cost.
- **FALSE that Claude always uses fewer tokens.** At max effort, Claude is among the heaviest token users on AA:
  - Sonnet 5.5 (max): ~197k output tokens per Intelligence Index task.
  - Haiku 5.5 (max): ~162k.
  - GPT-6.1 Sol (max): ~38k.
  - The token efficiency comes from **the effort setting**, not the brand.
- **"Succeed first try" is overstated.** The best coding agents score 60-68% pass@1 on AA's Coding Agent Index, which means about **1.5 attempts per solved task**. The cheap models are at 39-43%, or about **2.3-2.6 attempts**. The retry gap is real but modest.
- **The claim becomes true for DeepSeek too once human time is counted.** With 5 minutes of developer review per attempt at $100/h, success rate dominates and token price stops mattering. GPT-6.1 Sol (medium) and Sonnet 5.5 (high) then beat DeepSeek V4 Pro per solved task.

---

## Table 1 - Coding agents: cost per SOLVED task (AA Coding Agent Index v1.5, live 2026-10-21)

**Source:** https://artificialanalysis.ai/agents/coding-agents. Values come from the page's embedded data, materialized 2026-10-21. Per-token prices come from https://artificialanalysis.ai/leaderboards/models on the same day.

**How the index works:** It is the equal-weighted average of pass@1 (averaged over 3 attempts per task) on DeepSWE v1.1 (113 tasks), Terminal-Bench 4.0 (66 tasks) and SWE-Atlas-QnA (124 tasks). The index score is therefore used here as p, the success rate per attempt.

**Formulas:**
- Cost per solved task = cost per attempt / p. This assumes you retry until success, that attempts are independent, and that success can be checked automatically.
- Expected attempts = 1/p.
- The last column adds **$8.33 of human time per attempt** (5 minutes of review at $100/h): (c + 8.33)/p.

| Agent + model | $/1M in / out | Total tokens/task | Output tokens/task | Cost/attempt | Pass@1 | **Cost per solved task** | Expected attempts | With 5-min human check/attempt |
|---|---|---|---|---|---|---|---|---|
| Claude Code - Opus 5.5 (max) | $4 / $20 | 15.6M | 333k | $13.04 | 66.0% | **$19.76** | 1.52 | $32.38 |
| Claude Code - Sonnet 5.5 (max) | $2 / $10 | 27.7M | 601k | $14.19 | 68.4% | **$20.75** | 1.46 | $32.92 |
| Claude Code - Sonnet 5.5 (xhigh) | $2 / $10 | 7.1M | 126k | $3.33 | 62.9% | **$5.29** | 1.59 | $18.54 |
| Claude Code - Sonnet 5.5 (high) | $2 / $10 | 2.7M | 41k | $1.24 | 55.0% | **$2.25** | 1.82 | $17.40 |
| Claude Code - Sonnet 5.5 (medium) | $2 / $10 | 1.3M | 21k | $0.62 | 45.9% | **$1.35** | 2.18 | $19.50 |
| Claude Code - Sonnet 5.5 (low) | $2 / $10 | 1.0M | 16k | $0.48 | 42.1% | **$1.14** | 2.38 | $20.93 |
| Claude Code - Haiku 5.5 (xhigh) | $0.1 / $0.5* | 7.1M | 190k | $0.61 | 41.4% | **$1.47** | 2.42 | $21.59 |
| Claude Code - Haiku 5.5 (max) | $0.1 / $0.5* | 13.8M | 1,001k | $2.80 | 36.8% | **$7.61** | 2.72 | $30.24 |
| Codex - GPT-6.1 Sol (medium) | $2 / $10 | 2.3M | 22k | $0.70 | 61.4% | **$1.14** | 1.63 | **$14.71** (best) |
| Codex - GPT-6.1 Sol (xhigh) | $2 / $10 | 3.2M | 35k | $1.04 | 62.9% | **$1.65** | 1.59 | $14.90 |
| Codex - GPT-6 Astra (max) | $10 / $50 | 3.3M | 47k | $7.47 | 61.6% | **$12.13** | 1.62 | $25.65 |
| Antigravity CLI - Gemini 4 Argon (high) | $2 / $10 | 13.7M | 112k | $5.84 | 63.8% | **$9.15** | 1.57 | $22.21 |
| Opencode - GLM-5.3 (max) | $1.4 / $4.4 | 14.3M | 74k | $4.24 | 53.6% | **$7.91** | 1.87 | $23.45 |
| Kimi Code CLI - Kimi K3 | $3 / $15 | 8.5M | 93k | $5.05 | 51.9% | **$9.73** | 1.93 | $25.78 |
| Claude Code - Qwen3.8 Max | $2 / $6 | 8.7M | 106k | $3.48 | 43.3% | **$8.04** | 2.31 | $27.27 |
| Grok Build - Grok 4.7 (xhigh) | $2 / $6 | 14.3M | 123k | $8.82 | 56.3% | **$15.67** | 1.78 | $30.46 |
| Claude Code - Step 5 Preview | $1 / $2.7 | 21.7M | 126k | $1.66 | 51.2% | **$3.24** | 1.95 | $19.51 |
| Codex - DeepSeek V4 Pro 0813 (max) | $1.32 / $3.96 | **24.2M** (most) | 116k | $0.24** | 43.1% | **$0.56** | 2.32 | $19.88 |
| Codex - DeepSeek V4 Flash 0731 (max) | $0.30 / $1.20 | 15.3M | 80k | $0.08** | 38.7% | **$0.21** (cheapest) | 2.58 | $21.73 |
| Codex - GPT-6 Luna (max) | $0.10 / $0.50 | 10.2M | 98k | $0.18 | 41.1% | **$0.44** | 2.43 | $20.71 |

\* Haiku 5.5 is listed on AA at $0.10/$0.50. Its measured per-task costs ($0.61 and $2.80) do not reconcile with those list prices and the token counts. Verify Anthropic's actual Haiku 5.5 price before quoting it.
\** DeepSeek's measured costs look **lower than list price × tokens would imply**. At 24.2M tokens per task with a 99% cache-hit rate at $0.044/1M, cache reads alone come to about $1.05. AA may be applying discounted, off-peak or promotional DeepSeek pricing. Check the AA methodology page before you put DeepSeek's exact dollar figure on screen. The direction of the result (DeepSeek far cheaper per solved task) holds at any plausible price.

### What Table 1 shows

1. **Supports the claim:** "cheap" mid-tier models lose to Claude Sonnet per solved task.
   - Sonnet 5.5 (high) solves 55% at **$2.25 per solve**.
   - GLM-5.3 (53.6%) costs **$7.91**, Kimi K3 (51.9%) **$9.73**, Qwen3.8 Max (43.3%) **$8.04** and Grok 4.7 (56.3%) **$15.67**. All have lower or similar output prices, yet each costs **3.5-7x more per solved task**.
   - Sonnet 5.5 (low) matches Qwen3.8 Max's success rate at **one-seventh the cost** ($1.14 vs $8.04). It uses about 1/9th of the tokens (1.0M vs 8.7M).
2. **Supports the claim:** token bloat is real.
   - DeepSeek V4 Pro uses **24.2M tokens per task**, the most of any agent on the board. Sonnet 5.5 (low) uses **1.0M** for a similar pass rate, about 25x fewer.
3. **Contradicts the claim:** DeepSeek and GPT-6 Luna still win on API dollars.
   - DeepSeek V4 Flash costs **$0.21 per solve**. Sonnet 5.5 (low) costs $1.14 (5x more), Sonnet 5.5 (high) $2.25 (11x) and Opus 5.5 (max) $19.76 (94x).
   - Token bloat does not overcome a per-token price gap of 10-60x.
4. **Contradicts the claim:** max effort destroys Claude's token efficiency.
   - Sonnet 5.5 (max) uses 27.7M tokens and $14.19 per attempt to gain 13 points over "high".
   - Haiku 5.5 (max) emits **1M output tokens per task** and does *worse* than Haiku xhigh (36.8% vs 41.4%).
5. **Once human time counts, success rate dominates.**
   - At $8.33 of review time per attempt, the ranking flips to GPT-6.1 Sol (medium) at $14.71, then GPT-6.1 Sol (xhigh), then Sonnet 5.5 (high) at $17.40.
   - Step 5 at $19.51 and DeepSeek V4 Pro at $19.88 now trail Sonnet 5.5 (high).
   - The "rework" half of the claim is where it holds up best.

---

## Table 2 - General intelligence: AA Intelligence Index v4.3 cost per task (live 2026-10-21)

**Sources:**
- https://artificialanalysis.ai/leaderboards/models, for cost per task, price and index.
- https://artificialanalysis.ai/models, for output tokens per task (shown for each model's default listed variant, usually max effort).

**Note on cost per task:** AA cost per task is the weighted average API cost per index question. "Cost per index point" = cost per task / score. It is a rough "cost per unit of correctness" proxy, not a true cost per solve, because the index is not a simple pass rate.

| Model (effort) | $/1M in / out | Output tokens/task | Cost/task | Index | Cost per index point (¢) |
|---|---|---|---|---|---|
| Claude Opus 5.5 (max) | $4 / $20 | ~119k | $5.98 | 57.6 | 10.4 |
| Claude Opus 5.5 (high) | $4 / $20 | n/a | $1.82 | 53.6 | 3.4 |
| Claude Opus 5.5 (medium, default) | $4 / $20 | n/a | **$1.34** | **51.2** | 2.6 |
| Claude Opus 5.5 (low) | $4 / $20 | ~9k (20M total) | **$0.55** | **42.3** | 1.3 |
| Claude Sonnet 5.5 (max) | $2 / $10 | **~197k** | $5.46 | 56.0 | 9.8 |
| Claude Sonnet 5.5 (high) | $2 / $10 | n/a | $0.88 | 46.8 | 1.9 |
| GPT-6.1 Sol (medium) | $2 / $10 | n/a | $0.21 | 47.8 | 0.45 |
| GPT-6.1 Sol (max) | $2 / $10 | ~38k | $0.72 | 51.8 | 1.4 |
| Gemini 4 Argon (high) | $2 / $10 | ~62k | $1.99 | 52.6 | 3.8 |
| **Qwen3.8 Max (0902)** | **$2 / $6** | ~108k | **$5.41** | **45.4** | **11.9** |
| **Grok 4.7 (xhigh)** | **$2 / $6** | ~81k | **$3.74** | 46.4 | 8.1 |
| **Kimi K3 (max)** | $3 / $15 | ~48k | **$2.00** | 43.6 | 4.6 |
| **GLM-5.3 (max)** | **$1.4 / $4.4** | ~71k | **$2.01** | 44.8 | 4.5 |
| DeepSeek V4 Pro 0813 (max) | $1.32 / $3.96 | ~75k (163M total) | $0.67 | 36.0 | 1.9 |
| DeepSeek V4.1 Flash 1017 (max) | $0.30 / $1.20 | ~89k | **$0.26** | **45.1** | **0.58** |
| MiMo-V2.6-Pro | $0.435 / $0.87 | ~64k | $0.13 | 46.3 | 0.29 |
| Claude Haiku 5.5 (max) | $0.1 / $0.5* | ~162k | $0.21 | 43.4 | 0.49 |

### What Table 2 shows

**Head-to-head A (supports the claim): Opus 5.5 (low) vs DeepSeek V4 Pro 0813 (max).**
Source: https://artificialanalysis.ai/models/comparisons/claude-opus-5-5-low-vs-deepseek-v4-pro

|  | Opus 5.5 (low) | DeepSeek V4 Pro (max) |
|---|---|---|
| Output price | $20/1M (5x DeepSeek) | $3.96/1M |
| Output tokens to run the whole index | **20M** | **163M** (8x more) |
| Total cost to run the index | **$860** | **$1,122** |
| Intelligence Index | **42** | 36 |

**This is the cleanest example of the claim on record.** The model with the 5x higher sticker price is both **cheaper and smarter**.

**Head-to-head B (supports the claim): Qwen3.8 Max vs Opus 5.5 (medium).**
Qwen has a 3.3x cheaper output price, yet costs 4x more per task ($5.41 vs $1.34) with a lower score (45.4 vs 51.2).

**Head-to-head C (contradicts the claim): DeepSeek V4.1 Flash 1017 vs Sonnet 5.5 (high).**
DeepSeek Flash nearly matches Sonnet 5.5 (high) in intelligence (45.1 vs 46.8) at **less than one-third the cost per task** ($0.26 vs $0.88).

**Head-to-head D (contradicts the claim): DeepSeek V4.1 Flash vs Opus 5.5 (max).**
Source: https://artificialanalysis.ai/models/comparisons/claude-opus-5-5-vs-deepseek-v4-1-flash

|  | Opus 5.5 (max) | DeepSeek V4.1 Flash (max) |
|---|---|---|
| Output tokens to run the index | 260M | 253M |
| Cost to run the index | $8,708 | $755 |
| Cost per task | $5.98 | $0.57 |

At max effort, Opus is **not** more token-efficient and costs **11.5x more**. Note that this comparison page lists an older Flash variant scoring 39, not the 1017 version scoring 45.

---

## Supporting evidence (with dates)

### Anthropic statements

- **Claude Opus 4.5 launch** (2025-11-24, https://www.anthropic.com/news/claude-opus-4-5):
  - "Set to a medium effort level, Opus 4.5 matches Sonnet 4.5's best score on SWE-bench Verified, but uses 76% fewer output tokens."
  - At highest effort it beats Sonnet 4.5 by 4.3 points.
  - Price: $5/$25.
- **Claude Opus 5.5 launch** (2026-09-22, https://www.anthropic.com/news/claude-opus-5-5):
  - Anthropic says Opus 5.5 "costs 40% less to run than Opus 5". Roughly half of that comes from a 20% price cut ($5/$25 to $4/$20). The rest comes from using fewer tokens per task.
  - On Terminal-Bench 4.0, Opus 5.5 at default effort beats Opus 5 at max effort "for about a fifth of the cost".
  - At default (medium) effort it beats GPT-6 Astra (max) "for about a fifth of the cost per task".
  - Customer quotes, all vendor-reported, not independent:
    - Kiro: "about 40% fewer calls and using half the tokens".
    - Box: "used a third of the tokens Opus 5 did".
    - GitHub: "less than half the steps".
    - Quantium: one task went from 38 prompts over 4 days to 11 prompts over 3 hours.
    - Rogo: about 60% fewer output tokens.
  - **Caveat:** headline benchmarks use max effort. Max effort uses about 3x the output tokens of default (260M vs about 88M on AA, as cited by secondary analyses).

### Artificial Analysis, earlier data points

- **Opus 4.5 analysis** (2025-11-25, https://artificialanalysis.ai/articles/claude-opus-4-5-benchmarks-and-analysis):

  | Model | Output tokens to run the Intelligence Index |
  |---|---|
  | Opus 4.5 | **48M** |
  | GPT-5.1 (high) | 81M |
  | Gemini 3 Pro | 92M |
  | Grok 4 | 120M |

  - Opus 4.5's cost to run fell from $3.1k (Opus 4.1) to about $1.5k.
  - Opus 4.5 still cost more to run than Gemini 3 Pro and GPT-5.1, because of its higher per-token price.
- **Intelligence Index v4.1** (2026-06-15, https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-1):
  - DeepSeek V4 Pro (max) cost **$0.04 per task** at an index of 44. That is "over 20x cheaper than GPT-5.5 (xhigh, $0.99) and over 40x cheaper than Claude Opus 4.8 (max, $1.78)".
  - **Strong counter-evidence.**
- **GPT-6 Sol/Luna** (2026-09-22, https://artificialanalysis.ai/articles/gpt-6-sol-and-luna-push-the-cost-efficiency-frontier):
  - GPT-6 Luna (max) uses **more** tokens per task than GPT-6 Sol: 51k vs 31k.
  - Luna is still 15x cheaper per task ($0.07 vs $1.06).
  - The cheap model uses more tokens and still wins on cost.
- **Intelligence Index v4.3** (2026-09-07, https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-3): cost per task methodology, with GPT-6 Astra (max) at $3.26 and Claude Fable 5.1 (max) at $7.63.
- **MiniMax-M2.7** (AA on X, about March 2026, https://x.com/artificialanlys/status/2034313324033372645):
  - About $175 to run the index at $0.30/$1.20.
  - GLM-5 cost about $547.
  - Shows wide token-efficiency variance even *among* cheap open models.

### Nous Research - "Measuring Thinking Efficiency in Reasoning Models: The Missing Benchmark" (Aug 2025)

https://nousresearch.com/measuring-thinking-efficiency-in-reasoning-models-the-missing-benchmark

- Open-weight reasoning models use **1.5-4x more tokens** than closed models on the same tasks, and **up to 10x more on simple knowledge questions**.
- They use about 3x more on knowledge prompts and less than 2x more on math and logic.
- On one AIME problem, DeepSeek-R1-0528 averaged about **3,104 reasoning tokens**, while gpt-oss-120b averaged about **268**, roughly 11.6x fewer.
- Magistral models were the worst offenders.
- Claude Opus 4 used the fewest reasoning tokens on logic puzzles. Caveat: Claude's API reports only a summarized chain of thought, so its reasoning-token counts are unreliable.
- Conclusion: closed models' token efficiency "often offsets" their higher price **for knowledge questions**. For math and logic, cost mostly tracked per-token price.
- Coverage: VentureBeat, "That cheap open-source AI model is actually burning through your compute budget" (https://venturebeat.com/ai/that-cheap-open-source-ai-model-is-actually-burning-through-your-compute-budget/).

### Aider Polyglot leaderboard (historical; last updated 2025-11-20)

https://aider.chat/docs/leaderboards/

- 225 exercises. Total cost per full run is listed next to the pass rate.
- Cost per solved exercise = total cost / (225 × pass rate).

| Model | Pass rate | Run cost | Cost per solved exercise |
|---|---|---|---|
| DeepSeek-V3.2-Exp (Reasoner) | 74.2% | $1.30 | **$0.008** |
| claude-opus-4 (32k thinking) | 72.0% | $65.75 | **$0.41** (about 50x DeepSeek) |
| DeepSeek V3 (0324) | 55.1% | $1.12 | $0.009 |
| claude-sonnet-4 (no thinking) | 56.4% | $15.82 | $0.125 (about 14x) |
| gpt-5 (high) | 88.0% | $29.08 | $0.147 |
| gpt-5 (medium) | 86.7% | $17.69 | $0.091 |

- **This is strong counter-evidence from the 2025 era.** DeepSeek was 14-50x cheaper per solved exercise at equal pass rates.
- Aider data is stale. It does not include Claude 4.5+ or DeepSeek V4.

### Other sources checked

- **SWE-bench Verified:** the official leaderboard (swebench.com) does not publish a consistent cost-per-resolved-issue column. AA's Coding Agent Index (Table 1) is the best current substitute: it uses the same style of task and reports cost, tokens and pass@1 together.
- **Terminal-Bench 4.0:** this is a component of both AA indices.
  - Coding agent data: Opus 5.5 at 60%, DeepSeek V4.1 Flash at 27%.
  - Comparison page: https://artificialanalysis.ai/models/comparisons/claude-opus-5-5-vs-deepseek-v4-1-flash
- **Not pursued in depth:** OpenHands Index, LiveBench and Epoch AI. Neither OpenHands nor LiveBench publishes per-run cost alongside success rate in a form that adds to the AA data. Epoch's work is mostly about price per token over time, not cost per solve.
- **Harness effect:** AA notes the harness can swing cost per task by more than 30x for the *same* model (AA on X; secondary summary). Their Coding Agent Index launch post put GLM-5.1 in Claude Code at 4.8M tokens/task and $2.26/task, and DeepSeek V4 Pro in Claude Code at $0.35/task. Token efficiency is partly a property of the agent scaffold, not just the model.

---

## Retry math (for the script)

**Formulas:**
- Expected cost per solved task = (cost per attempt + human cost per attempt) / p.
- Expected attempts = 1/p. This assumes independent retries and that success can be verified.

**API cost alone (Table 1 numbers):**
- DeepSeek V4 Pro: $0.24 / 0.431 = **$0.56**.
- Sonnet 5.5 (high): $1.24 / 0.55 = **$2.25**.
- DeepSeek wins by 4x.

**With 5 minutes of human review per attempt ($8.33):**
- DeepSeek: (0.24 + 8.33) / 0.431 = **$19.88**.
- Sonnet 5.5 (high): (1.24 + 8.33) / 0.55 = **$17.40**.
- GPT-6.1 Sol (medium): **$14.71**.
- Break-even: Sonnet 5.5 (high) beats DeepSeek V4 Pro once human cost per attempt passes about **$3.40**, roughly 2 minutes of a $100/h engineer.

**Caveats on the math:**
- Real retries are **not independent**. A model that fails a task often fails it again, so 1/p *understates* attempts for weak models on hard tasks. This favors the stronger model further.
- Pass@1 averages hide the hard tail. Opus and Sonnet at max effort reach tasks the cheap models never solve at any number of retries.

---

## Most video-friendly numbers

1. **"5x the price per token, but cheaper overall."** Claude Opus 5.5 (low) ran Artificial Analysis's full benchmark on **20M tokens for $860**. DeepSeek V4 Pro needed **163M tokens and $1,122**, and scored lower (42 vs 36).
2. **"The 'cheap' model costs 4x more."** Qwen3.8 Max costs $6 per million output tokens, against Opus 5.5 at $20. It spends **$5.41 per benchmark task** vs **$1.34** for Opus at default effort, and scores lower.
3. **"Same pass rate, one-seventh the cost."** On real coding-agent tasks, Sonnet 5.5 (low) solves 42% at **$1.14 per solve**. Qwen3.8 Max solves 43% at **$8.04**, using **9x more tokens**.
4. **"76% fewer tokens."** Anthropic: Opus 4.5 at medium effort matched Sonnet 4.5's best SWE-bench score with 76% fewer output tokens.
5. **"Open models think 1.5-4x longer"** (Nous Research): up to 10x on simple questions. On one math problem, DeepSeek R1 used 3,104 tokens vs 268 for gpt-oss.
6. **Honest counterpoint:** DeepSeek V4 Flash solves a coding task for **$0.21**. Opus 5.5 (max) takes **$19.76**, about 94x more. Token bloat does not erase a 60x price gap.
7. **The twist:** add five minutes of developer time per attempt and DeepSeek's advantage disappears. Sonnet 5.5 (high) at **$17.40** and GPT-6.1 Sol at **$14.71** per solved task beat DeepSeek V4 Pro at **$19.88**. **Your time is the expensive token.**
8. **Effort matters more than brand.** Claude Haiku 5.5 at max effort emits **1 million output tokens per coding task** and scores *lower* than at xhigh.
