# 01 - API list prices and "cost to run the Intelligence Index" (late 2026)

Access date for every source below: **2026-10-21** (all fetched the same day).
All prices are USD per 1M tokens, standard/default tier, short-context, unless noted.
"Cached" = cache hit/read price. Legend: **[OK]** official page and OpenRouter agree · **[OR-only]** official page did not show the number, value taken from OpenRouter's first-party endpoint · **[?]** uncertain or conflicting (see notes).

## Sources

| Key | URL | What it gave |
|---|---|---|
| S-OR | https://openrouter.ai/api/v1/models | Model list + cheapest-provider price per model (JSON) |
| S-ORE | https://openrouter.ai/api/v1/models/{id}/endpoints | Per-provider prices (used to get first-party price) |
| S-ORP | https://openrouter.ai/pricing | OpenRouter platform fee |
| S-ORF | https://openrouter.ai/docs/faq | "no markup on inference pricing"; BYOK rules |
| S-ANT | https://platform.claude.com/docs/en/about-claude/pricing | Anthropic official |
| S-OAI | https://developers.openai.com/api/docs/pricing (openai.com/api/pricing returned 403) | OpenAI official |
| S-GOO | https://ai.google.dev/gemini-api/docs/pricing | Google Gemini API official |
| S-DS | https://api-docs.deepseek.com/quick_start/pricing/ | DeepSeek official |
| S-XAI | https://docs.x.ai/docs/models | xAI official |
| S-ZAI | https://docs.z.ai/guides/overview/pricing | Z.ai (GLM) official |
| S-MM | https://platform.minimax.io/docs/guides/pricing | MiniMax official |
| S-ALI | https://www.alibabacloud.com/help/en/model-studio/model-pricing | Alibaba Model Studio (Qwen), Singapore/international |
| S-KIMI | https://platform.kimi.ai/docs/pricing/chat (moved from platform.moonshot.ai) | Kimi official — **price tables rendered empty**, no numbers obtained |
| S-AA | https://artificialanalysis.ai/models and https://artificialanalysis.ai/leaderboards/models (embedded page data) | Intelligence Index v4.3.2, cost to run index, token counts |
| S-AAM | https://artificialanalysis.ai/models/{slug} (deepseek-v4-pro, gemini-3-1-pro-preview, gemini-3-5-flash-lite, kimi-k2-7-code, minimax-m3, qwen3-7-plus) | Same fields for models not on the main list |

---

## 1. List prices per 1M tokens (first-party / official)

### Anthropic (S-ANT, S-ORE)

| Model | Input | Cached (hit) | 5m cache write | Output | Notes | Status |
|---|---|---|---|---|---|---|
| Claude Fable 5.1 (top tier) | 10.00 | 0.25 | 12.50 | 50.00 | cache hit = 0.025x input | [OK] |
| **Claude Opus 5.5** (latest Opus) | 4.00 | 0.20 | 5.00 | 20.00 | Fast mode 8/40; cache hit = 0.05x | [OK] |
| **Claude Sonnet 5.5** | 2.00 | 0.10 | 2.50 | 10.00 | cache hit = 0.05x | [OK] |
| **Claude Haiku 5.5** (prompt <=100k) | 0.10 | 0.01 | 0.125 | 0.50 | | [OK] |
| Claude Haiku 5.5 (prompt >100k) | 0.50 | 0.05 | 0.625 | 2.50 | whole request repriced 5x | [OK] |

Modifiers: Batch API -50%; `inference_geo: "us"` x1.1; 1M context at standard price (except Haiku 5.5 tiering). Tokenizer for Claude 4.7+ produces ~30% more tokens for the same text (S-ANT) — relevant when comparing per-token prices across vendors.

### OpenAI (S-OAI, S-ORE)

| Model | Input | Cached | Output | Flex/Batch (in/cached/out) | Fast (ex-Priority) | Status |
|---|---|---|---|---|---|---|
| **GPT-6 Astra** (flagship) | 10.00 | 1.00 | 50.00 | 5.00 / 0.50 / 25.00 | 20 / 2 / 100 | [OK] |
| **GPT-6.1 Sol** (mid/"main") | 2.00 | 0.10 | 10.00 | 1.00 / 0.05 / 5.00 | 4 / 0.2 / 20 | [OK] |
| GPT-6 Sol | 2.00 | 0.20 | 10.00 | 1.00 / 0.10 / 5.00 | 4 / 0.4 / 20 | [OK] |
| **GPT-6 Luna** (mini) | 0.10 | 0.01 | 0.50 | 0.05 / 0.005 / 0.25 | 0.2 / 0.02 / 1.0 | [OK] |
| **GPT-5.3-Codex** (latest codex) | 1.75 | 0.175 | 14.00 | n/a | 3.5 / 0.35 / 28 | [OK] |
| GPT-5.1-Codex-Mini (latest codex mini) | 0.25 | 0.03 | 2.00 | — | — | [OR-only] |

Long context (>272K input): GPT-6 models 2x input, 1.5x output (e.g. Sol 4/0.2/15, Astra 20/2/75). Regional processing +10%. No GPT-6-generation codex model exists on OpenRouter or the OpenAI pricing page as of access date. OpenRouter also lists `-pro` variants (gpt-6-astra-pro etc.) at the same token price.

### Google Gemini (S-GOO, S-ORE)

| Model | Input | Cached | Output | Batch/Flex | Priority | Status |
|---|---|---|---|---|---|---|
| **Gemini 4 Argon** (flagship) | 2.00 | 0.10 | 10.00 | 1.00/0.05/5.00 | 3.6/0.18/18 | [OK] **price doubles to 4.00/0.20/20.00 on 2026-12-01** |
| Gemini 3.1 Pro Preview (latest "Pro") | 2.00 (4.00 >200k) | 0.20 (0.40) | 12.00 (18.00) | 1.00/0.20/6.00 | 3.6/0.36/21.6 | [OK] |
| **Gemini 3.8 Flash** | 0.75 | 0.075 | 3.75 | 0.375/0.0375/1.875 | 1.35/0.135/6.75 | [OK] **doubles to 1.50/0.15/7.50 on 2027-01-01**; cache storage 0.50/1M tok/h |
| **Gemini 3.5 Flash-Lite** | 0.30 | 0.03 | 2.50 | 0.15/0.02/1.25 | 0.54/0.05/4.50 | [OK]; OR lists cache 0.015 on flex — minor diff |

Vertex AI "us"/"eu" regional endpoints are +10% (S-ORE).

### DeepSeek (S-DS, S-ORE)

| API name -> model | Input (cache miss) | Cached (hit) | Output | Off-peak (50%) in/cached/out | Status |
|---|---|---|---|---|---|
| `deepseek-flash` -> **DeepSeek-V4.1-Flash-1017** | 0.30 | 0.006 | 1.20 | 0.15 / 0.003 / 0.60 | [OK] |
| `deepseek-v4-pro` -> **DeepSeek-V4-Pro-0813** | 1.32 | 0.044 | 3.96 | 0.66 / 0.022 / 1.98 | [OK] |

- **Peak hours (full price): 01:00–04:00 and 06:00–10:00 UTC, Mon–Fri**, excluding Chinese public holidays. **Everything else is off-peak at 50%** (weekends, holidays, and ~17 of 24 weekday hours). OpenRouter's DeepSeek endpoint encodes exactly these windows as time-based overrides (S-ORE).
- No separate "R" (reasoner) model any more: both models have thinking/non-thinking modes, thinking is default (S-DS). Legacy `deepseek-v4-flash` / `deepseek-v4-flash-vision-exp` names are retired and billed as V4.1 Flash.
- 1M context, up to 384K output. Search/Fetch tools $0.75 per 1k requests from 2026-11-01.
- Open weights: third-party hosts on OpenRouter go far lower (V4.1 Flash from 0.049/0.375 on an fp4 host; V4 Pro from 0.225 in) — quantization varies (S-ORE). [?] quality not guaranteed equal.

### Qwen / Alibaba (S-ALI, S-ORE)

| Model | Input | Cached | Output | Status |
|---|---|---|---|---|
| **Qwen3.8-Max (0902)** | 2.00 | 0.25 | 6.00 | Input/output [OK]; cached [OR-only] (Alibaba page says cache hits are billed at a discount but gives no number) |
| Qwen3.8-Max-Prime | 4.00 | 0.50 | 12.00 | [OR-only] not on Alibaba page |
| Qwen3.8 2.4T-A95B (open weights) | 2.00 | 0.25 | 6.00 | [OK] |
| **Qwen3.8-Flash** | 0.15 | 0.016 | 0.47 | Input/output [OK]; cached [OR-only] |
| Qwen3.7-Flash (<=32K / 32–256K / 256K–1M) | 0.03 / 0.10 / 0.20 | 0.006 (OR) | 0.13 / 0.40 / 0.80 | [OK] tiered |
| Qwen3.7-Plus (<=256K) | 0.40 (OR: 0.32) | 0.064–0.08 | 1.60 (OR: 1.28) | [?] Alibaba page shows "limited-time 20% discount" label; OR shows the discounted price |
| Qwen3.8-27B (open weights) | 0.50 | — | 3.00 | [OK] (OR cheapest host 0.04/1.35) |

### Kimi / Moonshot (S-KIMI could not be read; S-ORE, S-AA)

| Model | Input | Cached | Output | Status |
|---|---|---|---|---|
| **Kimi K3** (2.8T open weights, 1M ctx) | 3.00 | 0.30 | 15.00 | [?] [OR-only] Moonshot first-party endpoint on OpenRouter; Artificial Analysis uses the same 3/0.3/15. Official page tables did not render. |
| Kimi K2.7 Code | 0.95 | 0.19 | 4.00 | [?] [OR-only] (Moonshot int4 endpoint; AA uses same) |

OpenRouter's headline price for K3 (0.239 in / 11.94 out) is a third-party fp4 host, not Moonshot.

### GLM / Z.ai (S-ZAI, S-ORE)

| Model | Input | Cached | Output | Status |
|---|---|---|---|---|
| **GLM-5.3** | 1.40 | 0.26 | 4.40 | [OK] |
| GLM-5.3-Prime | 2.80 | 0.56 | 8.80 | [?] [OR-only] served only via Alibaba on OR; not on Z.ai page |
| GLM-5.3-FlashX | 0.37 | 0.075 | 1.25 | [?] Z.ai 0.075 cached vs OR 0.09 |
| **GLM-5.3-Flash** | 0.15 | 0.03 | 0.50 | [OK] |

Cache storage currently "limited-time free". GLM-4.7-Flash / 4.5-Flash are free. OpenRouter headline GLM-5.3 price (0.079/1.40) is a third-party fp4 host.

### MiniMax (S-MM, S-ORE)

| Model | Input | Cached | Output | Status |
|---|---|---|---|---|
| **MiniMax-M3.1-Flash** (released 2026-10-19) | 0.15 | 0.015 | 0.60 | [OK] official; OpenRouter currently only has a `:free` variant (0/0/0) |
| MiniMax-M3 (<=512K) | 0.30 | 0.06 | 1.20 | [OK] "permanent 50% discount" price |
| MiniMax-M3 (>512K) | 0.60 | 0.12 | 2.40 | [OK]; Priority tier = 1.5x |

### xAI Grok (S-XAI, S-ORE)

| Model | Input | Cached | Output | Status |
|---|---|---|---|---|
| **Grok 4.7** (flagship, 500K ctx) | 2.00 | 0.50 | 6.00 | [OK]; >=200K prompt: 4/1/12 for whole request; priority 2x |
| Grok Build 0.1 (coding) | 1.00 | 0.20 | 2.00 | [OK] |
| Grok 4.3 / 4.20 (cheaper, 1M ctx) | 1.25 | 0.20 | 2.50 | [OK] |

No current "grok mini/fast" model on either source. OpenRouter brands the vendor "SpaceXAI".

---

## 2. OpenRouter fees (S-ORP, S-ORF)

| Item | Value |
|---|---|
| Inference markup | **None** — "there is no markup on inference pricing" (S-ORF); per-provider prices equal the provider's list price (verified for Anthropic, OpenAI, Google, xAI, DeepSeek first-party endpoints above) |
| Credit purchase fee | **5.5% (Standard plan), 8% (Business plan)** on credit purchases (card or USDC) (S-ORP) |
| Minimum fee / separate crypto % | Not stated on pricing page; FAQ shows unrendered placeholders. [?] |
| BYOK | First $25,000/month of list-price inference free, then **5%** of OpenRouter list price (S-ORP, S-ORF) |

Effective OpenRouter cost on Standard = list x 1.055.
Note: OpenRouter's `/models` headline price is the **cheapest provider**, often a quantized third-party host — use `/endpoints` for the first-party price.

---

## 3. Artificial Analysis: Intelligence Index v4.3.2 and cost to run it (S-AA, S-AAM)

"Cost to run" = total USD AA spent running the full Intelligence Index suite at the prices AA assumes (shown in the last column; these match the first-party list prices above). It includes input (incl. cache reads/writes) + output (reasoning + answer). Highest-effort setting shown unless noted.

| Model (AA setting) | Index | Cost to run index | Output tokens to run | of which reasoning | $ per index point | AA price assumption in/cached/out |
|---|---|---|---|---|---|---|
| Claude Opus 5.5 (Max) | 57.6 | $8,708 | 259.9M | 213.9M | $151 | 4 / 0.2 / 20 |
| Claude Sonnet 5.5 (Max) | 56.0 | $7,260 | 415.8M | 357.9M | $130 | 2 / 0.1 / 10 |
| Claude Fable 5.1 (Max) | 53.4 | $13,129 | 188.5M | 147.3M | $246 | 10 / 0.25 / 50 |
| GPT-6 Astra (Max) | 52.7 | $5,324 | 60.0M | 44.4M | $101 | 10 / 1 / 50 |
| Gemini 4 Argon (High) | 52.6 | $2,407 | 112.8M | 81.5M | $46 | 2 / 0.1 / 10 (pre-Dec-1 price; ~2x after) |
| **GPT-6.1 Sol (Max)** | 51.8 | **$1,082** | 67.2M | 49.8M | **$21** | 2 / 0.1 / 10 |
| Grok 4.7 (Xhigh) | 46.4 | $4,967 | 240.4M | 212.9M | $107 | 2 / 0.5 / 6 |
| Qwen3.8 Max (0902) | 45.4 | $4,935 | 192.0M | 148.8M | $109 | 2 / 0.25 / 6 |
| **DeepSeek V4.1 Flash 1017 (Max)** | 45.1 | **$445** | 210.9M | 170.7M | **$9.9** | 0.3 / 0.006 / 1.2 (peak price; off-peak would be ~half) |
| GLM-5.3 (Max) | 44.8 | $2,503 | 208.6M | 179.5M | $56 | 1.4 / 0.26 / 4.4 |
| Kimi K3 (Max) | 43.6 | $3,658 | 160.8M | 139.3M | $84 | 3 / 0.3 / 15 |
| **Claude Haiku 5.5 (Max)** | 43.4 | **$330** | 435.2M | 397.6M | **$7.6** | 0.1 / 0.01 / 0.5 |
| **MiniMax-M3.1-Flash** | 42.7 | **$283** | 182.6M | 150.8M | **$6.6** | 0.15 / 0.015 / 0.6 |
| **GLM-5.3-Flash** | 41.8 | **$306** | 180.7M | 151.5M | **$7.3** | 0.15 / 0.03 / 0.5 |
| Gemini 3.8 Flash (High) | 40.9 | $1,623 | 172.2M | 136.0M | $40 | 0.75 / 0.075 / 3.75 |
| **GPT-6 Luna (Max)** | 38.1 | **$122** | 144.4M | 128.2M | **$3.2** | 0.1 / 0.01 / 0.5 |
| DeepSeek V4 Pro 0813 (Max) | 36.0 | $1,122 | 162.9M | — | $31 | 1.32 / 0.044 / 3.96 |
| Qwen3.8 27B (Xhigh) | 33.7 | $1,336 | 198.3M | 170.8M | $40 | 0.5 / 0.1 / 3 |
| Gemini 3.1 Pro Preview | 29.7 | $1,935 | 67.1M | — | $65 | 2 / 0.2 / 12 |
| MiniMax-M3 | 29.2 | $538 | 117.1M | — | $18 | 0.3 / 0.06 / 1.2 |
| Kimi K2.7 Code | 25.8 | $993 | 122.1M | — | $38 | 0.95 / 0.19 / 4 |
| Qwen3.7 Plus | 25.2 | $428 | 134.8M | — | $17 | 0.4 / 0.08 / 1.6 |
| Gemini 3.5 Flash-Lite | 22.2 | $366 | 59.5M | — | $16 | 0.3 / 0.03 / 2.5 |
| GPT-5.3 Codex (Xhigh) | 32.5 (estimated by AA) | n/a | n/a | n/a | n/a | 1.75 / 0.175 / 14 |

Notes / caveats:
- "$ per index point" is a derived figure (cost / index), not published by AA.
- Index scores are rounded from AA's raw values (e.g. 57.6 = 57.63). AA's own headline display rounds to integers (Opus 5.5 Max = 58).
- Token efficiency spread is huge: GPT-6 Astra used 60M output tokens vs Claude Haiku 5.5 435M and Sonnet 5.5 416M. Input tokens (mostly cached agentic context) are also large: 1.2B (Astra) to 18.7B (Sonnet 5.5), so cache-hit price matters (e.g. Grok 4.7's $0.50 cached price is why its run costs ~$5k despite a $6 output price).
- GPT-5.3 Codex: AA marks its index as estimated and publishes no cost/token data. [?]
- Not covered by AA cost data: Qwen3.8-Flash (only "Qwen3.8-Flash-Next" has an index of 39.8, no cost), GPT-6 Sol (non-.1), GLM-5.3-FlashX, Grok Build.
- AA costs for DeepSeek use peak price; running entirely off-peak would cost about $223.

---

## 4. Summary

**Cheapest per token (paid, first-party list price)**
- Sub-$0.20 input / <=$0.60 output tier: Qwen3.7-Flash (0.03/0.13, <=32K prompts), GPT-6 Luna and Claude Haiku 5.5 (0.10/0.50), Qwen3.8-Flash (0.15/0.47), GLM-5.3-Flash (0.15/0.50), MiniMax-M3.1-Flash (0.15/0.60), DeepSeek V4.1 Flash off-peak (0.15/0.60; peak 0.30/1.20). MiniMax-M3.1-Flash is currently free on OpenRouter.
- Frontier tier (index >50): Gemini 4 Argon and GPT-6.1 Sol both 2/10 (Argon goes to 4/20 on 2026-12-01); Sonnet 5.5 also 2/10.

**Cheapest per index run (Artificial Analysis cost to run)**
- Cheapest overall: **GPT-6 Luna, $122** (index 38.1).
- Best value at ~42–45 index: MiniMax-M3.1-Flash $283, GLM-5.3-Flash $306, Claude Haiku 5.5 $330, DeepSeek V4.1 Flash $445 (index 45.1, ~$223 off-peak).
- Cheapest frontier (>50): **GPT-6.1 Sol, $1,082** (index 51.8), about 1/8 the cost of Claude Opus 5.5 ($8,708, index 57.6, the top score) and less than half of Gemini 4 Argon ($2,407).
- Per-token price does not predict run cost: Grok 4.7 (2/0.5/6) costs $4,967 per run, about 4.6x GPT-6.1 Sol at a similar list price, because it uses ~3.6x more output tokens and has a 5x higher cached-input price. Haiku 5.5 and GPT-6 Luna have the same list price, but Haiku costs 2.7x more per run because it uses ~3x more output tokens.
