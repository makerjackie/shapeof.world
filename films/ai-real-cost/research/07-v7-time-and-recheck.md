# 07 - v7 recheck (2026-10-22) and the "your time" numbers

Research date: 2026-10-22 (Beijing 2026-10-23). Labels: [OFFICIAL] first-party page; [MEASURED-3P] independent measurement; [SURVEY] first-party survey; [DERIVED] this film's arithmetic; [ASSUMED] this film's assumption.

## A. Prices: unchanged since 10-21

| Item | Value | Source |
|---|---|---|
| Claude Opus 5.5 | $4 in / $20 out per 1M, cache read $0.20 [OFFICIAL] | https://platform.claude.com/docs/en/about-claude/pricing |
| Claude Sonnet 5.5 | $2 / $10 [OFFICIAL] | same |
| Claude Max 5x / 20x | $100 / $200 a month [OFFICIAL] | https://support.claude.com/en/articles/11049741-what-is-the-max-plan |
| GPT-6.1 Sol / GPT-6 Astra / GPT-6 Luna | $2/$10 · $10/$50 · $0.10/$0.50 [OFFICIAL] | https://developers.openai.com/api/docs/pricing |
| deepseek-flash (V4.1-Flash-1017) | peak ¥0.04 hit / ¥2 miss / ¥8 out; off-peak half [OFFICIAL] | https://api-docs.deepseek.com/zh-cn/quick_start/pricing |
| deepseek-v4-pro (V4-Pro-0813) | peak ¥0.30 / ¥9 / ¥27; off-peak half [OFFICIAL] | same |
| DeepSeek change log | newest entries 2026-10-17; no V4.1 Pro [OFFICIAL] | https://api-docs.deepseek.com/zh-cn/updates |
| Newer models? | none from Anthropic, OpenAI or DeepSeek since 10-21 | release notes and pricing pages above |
| ChatGPT Pro tiers | a $500 tier reported since 9-29 (secondary only); the official page renders prices client-side. Not used in v7 | |

USD/CNY central parity: **6.7195 on 2026-10-22** (6.7192 on 10-21), 中国外汇交易中心 data service `CcprHisNew` [OFFICIAL].

## B. Artificial Analysis

Intelligence Index v4.3.2 (leaderboard + model pages, 2026-10-22) [MEASURED-3P], unchanged:
- Opus 5.5 (max) #1, 57.62. Opus 5.5 (low) cost to run $860.33, about 19.6M output tokens, 42.31. Opus 5.5 (medium) $1.336 per task, 51.24.
- DeepSeek V4 Pro 0813 (max) $1,122.27, about 162.9M output tokens, 36.00. V4.1 Flash 1017 (max) $0.262 per task, 45.10.

**Coding Agent Index is now v2.0** (FrontierCode v1.1, Terminal-Bench 4.0, SWE-Atlas-QnA-AA; methodology page: "Version 2.0 October 2026 - current"). Page payload `materializedAt` 2026-10-23T01:09:35Z. Values read from the raw payload [MEASURED-3P]:

| Entry | pass@1 (index) | $ per attempt | total tokens | cached | output | wall time |
|---|---|---|---|---|---|---|
| Claude Code – Opus 5.5 (max) | 0.6165 | 11.4227 | 14.52M | 13.68M | 279k | 61.0 min |
| DeepSeek Harness – DeepSeek V4.1 Flash 1017 (max) | 0.4631 | 0.2963 | 16.74M | 16.40M | 106k | 21.4 min |
| Codex – DeepSeek V4.1 Flash (max) | 0.4730 | 0.3862 | 27.24M | 26.89M | 157k | 38.1 min |
| Claude Code – Sonnet 5.5 (max) | 0.593 | 13.30 | 24.13M | | 495k | 79.7 min |
| Codex – GPT-6.1 Sol (max) | 0.541 | 1.50 | 3.94M | | 55k | 23.7 min |

- v1.5 entries used by v6 (Sonnet 5.5 high, DeepSeek V4 Pro, V4 Flash 0731, GPT-6.1 Sol medium) are gone.
- AA's $0.2963 for V4.1 Flash reconciles exactly with today's **peak** USD price: 16.397M × $0.006 + 0.237M × $0.30 + 0.106M × $1.20 = $0.2962 [DERIVED]. So v2.0 uses current prices (unlike v1.5's DeepSeek rows, see research/06 B3).
- Opus 5.5 rows note "Default Fallback": 76 of 870 attempts fell back to Claude Opus 4.8 after a refusal. The index score includes them.

## C. The time chapter

| Number | Value | How | Label |
|---|---|---|---|
| Use AI answers as-is | 9.6% ("Only 10% use answers as-is"); run locally 76.5%, compare with codebase 63.9%, inspect tests/security 53.0%; n = 13,162, multi-select | Stack Overflow Developer Survey 2026, https://survey.stackoverflow.co/2026/ai/data (published 2026-10-06) | [SURVEY] |
| Checks per 100 tasks | Opus 162.2, DeepSeek 216.0, gap 53.8 | 100 ÷ pass@1 (independent retries; weak models really fail repeatedly on hard tasks, so this flatters DeepSeek) | [DERIVED] |
| Minutes per check | 5 | conservative; no primary measurement of minutes per AI change exists (checked METR 2025/2026, DORA 2025/2026, Sonar 2026, Faros 2026, MSR 2026 agent-PR studies) | [ASSUMED] |
| Hours | 13.52 h vs 18.00 h, gap 4.48 h | checks × 5 min | [DERIVED] |
| Hourly wage | ¥119.13 | 国家统计局 2025 城镇非私营单位 信息传输、软件和信息技术服务业 248,752 元 (https://www.stats.gov.cn/sj/zxfb/202605/t20260515_1963707.html, 2026-05-15) ÷ 12 ÷ 21.75 ÷ 8 (人社部发〔2025〕2号, https://www.gov.cn/zhengce/zhengceku/202501/content_6995777.htm: 小时工资 = 月工资收入 ÷ (月计薪天数 × 8)) | [OFFICIAL] + [DERIVED] |
| Opus tokens / 100 tasks | ¥345.8 (Max, ÷36); ¥12,449.5 at API price | $11.4227 × 162.2 × 6.7195 (÷36) | [DERIVED] |
| DeepSeek tokens / 100 tasks | ¥213.3 off-peak (¥426.6 peak) | per attempt at CNY list price: 16.397M × ¥0.04 + 0.237M × ¥2 + 0.106M × ¥8 = ¥1.975 peak, ¥0.988 off-peak; × 216.0 | [DERIVED] |
| Your time | ¥1,610.3 vs ¥2,144.0 | hours × ¥119.13 | [DERIVED] |
| Totals | ¥1,956.1 vs ¥2,357.3 (gap ¥401) | | [DERIVED] |
| Share of the bill that is your time | 82.3% vs 91.0% | | [DERIVED] |
| Break-even minutes per check | 1.24 min | (¥345.8 − ¥213.3) ÷ (53.8 × ¥119.13 / 60) | [DERIVED] |

Round-by-round counts on screen (whole tasks, chosen so the totals hit 162 and 216): Opus solves 62, 23, 9, 4, 1, 1; DeepSeek solves 46, 25, 12, 8, 5, 2, 1, 1.

Also on screen:
- Stack Overflow 2025: 66% name "AI solutions that are almost right, but not quite" as the top frustration (25,332 responses); 45.2% say debugging AI code takes longer (https://survey.stackoverflow.co/2025/ai) [SURVEY]. The 2025 blog post swaps the two numbers; use the survey page. The 2026 survey dropped this question.
- Machine time per attempt (AA v2.0 `agentWallTimeSec`): Opus 5.5 3,661 s (61.0 min), DeepSeek V4.1 Flash 1017 1,285 s (21.4 min) [MEASURED-3P]. Per solved task that is about 99 min vs 46 min of agent time, which the film shows as the counter-point: the smart one is slower, but that time is the machine's, not yours.
- Per-benchmark pass@1 (AA v2.0 payload, `evals[].mean.reward`) [MEASURED-3P]:

  | Benchmark (what it is) | Opus 5.5 (max) | V4.1 Flash 1017 (max) | checks per 100 tasks [DERIVED] |
  |---|---|---|---|
  | SWE-Atlas-QnA-AA (trace a repository's code and answer questions; 124 tasks, binary pass/fail) | 65.86% | 61.56% | 151.8 vs 162.4 |
  | FrontierCode v1.1 (changes to real open-source repos, partial credit 0 or 70–100%; 100 tasks) | 55.97% | 46.55% | not shown (partial credit is not a pass rate) |
  | Terminal-Bench 4.0 (terminal tasks across software, ML, science, security, sysadmin; 66 tasks, pass/fail) | 63.13% | 30.81% | 158.4 vs 324.6 |

  On Terminal-Bench the extra checks are 166 × 5 min ≈ 13.9 h per 100 tasks. Caveat: 66 tasks × 3 attempts is a small sample.

Other evidence read but not put on screen:
- METR 2025 RCT: experienced developers took 19% longer with early-2025 AI; ~9% of their time went to reviewing and cleaning AI output; they accepted < 44% of generations (arXiv 2507.09089). METR's 2026 follow-up calls its new data an unreliable signal.
- Agent PR studies: 54.9% (Watanabe et al., arXiv 2509.14745) to 74.1% (MSR 2026, arXiv 2601.20106) of merged agent PRs went in unmodified.
