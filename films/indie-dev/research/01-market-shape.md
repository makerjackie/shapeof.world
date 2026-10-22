# 01 - Market shape: indie / solo software products, before and after AI coding tools (2023 -> 2026)

Research date: 2026-10-21. Written for a Chinese data-explainer on 独立开发者 / indie hackers / solo founders.
Every number below was read on the cited page (or marked otherwise). Nothing is invented. Where a number is only seen in a search-result snippet or a secondary write-up, that is stated.

Label key: [OFFICIAL] platform/company's own data - [REPORT] third-party industry report with stated method - [SELF-REPORTED] an individual's or company's own claim - [MEDIA] press - [DERIVED] my arithmetic from sourced numbers.
A trailing "(weak)" means the method is unclear, the source is secondary, or I could not open the primary page.

Note on tooling: the shared web-search budget ran out near the end of this session, so a few planned lookups (Cloudflare crawl-to-referral ratios, Similarweb 2026 zero-click update, Cursor/Replit/Bolt primary user counts) were NOT done. See "Gaps" at the bottom.

---

## 0. Most striking numbers (best-sourced first)

| # | Number | What it measures | Source (date) | Label |
|---|---|---|---|---|
| 1 | **17.3% and 4.6%** | Share of newly launched subscription apps that reach $1K / $10K monthly revenue within 2 years (RevenueCat sample: 115,000+ apps, $16B+ revenue). Last year's edition: 19% and 5.3%. So the odds got *worse* while launches rose ~7x. | RevenueCat, State of Subscription Apps 2026 (~Mar 2026) | [OFFICIAL] |
| 2 | **~$72 / month** | Typical (median) monthly revenue of a subscription app one year after launch. Top 25% start at >$429; top 10% at >~$2,574. | RevenueCat SOSA 2026 | [OFFICIAL] |
| 3 | **~560,000 vs ~600,000** | New iOS App Store apps in H1 2026 vs the whole of 2025. Meanwhile App Store downloads rose only +2% (17.6B). New-app supply roughly doubled; demand did not. | Sensor Tower via NYT / 9to5Mac (2026-07-20) | [REPORT] |
| 4 | **82,669 -> 170,222** | Product Hunt launch submissions: all of 2025 vs 2026 so far (to Oct 21). The share that PH "features" fell from 37% (2023) to 3.8% (2026). | hunted.space "Product Hunt Pulse" (live to 2026-10-21) | [REPORT] (weak: third-party tracker) |
| 5 | **23.7% -> 36.3%** (Carta) and **63%** (Stripe Atlas) | Share of new startups with a single founder: 2019 -> H1 2025 (Carta); share of Stripe Atlas C-corps formed in Q2 2026 (to May 28) that are solo. | Carta Solo Founders Report (2025-12-09); Stripe blog (2026-05-28) | [REPORT] / [OFFICIAL] |
| 6 | **-23% vs +19%** (and 34x -> 61x) | Solo-founded Stripe Atlas startups, 2025 vs 2024: median first-6-month revenue fell 23%; top-decile revenue rose 19%. Top-decile / median revenue ratio: ~34x four years ago, 61x in 2025. "Gap between typical and top is widening." | Stripe blog (2026-05-28) | [OFFICIAL] |
| 7 | **92%** | Share of 2025 in-app-purchase revenue captured by the top 1% of publishers (and 81% of downloads); $154B vs $13.1B for the other 99%. | Sensor Tower State of Mobile 2026, as quoted by Axis Intelligence (2026-08-11) | [REPORT] (weak: primary not opened) |
| 8 | **8% vs 15%** | Share of Google visits with a click on a normal result link when an AI summary appears vs when it doesn't (900 US adults, March 2025). Clicks on links inside the AI summary: ~1%. | Pew Research Center (2025-07-22) | [REPORT] |
| 9 | **7.3% -> 1.6%** | Position-1 desktop click-through rate on keywords that later got an AI Overview, Dec 2023 -> Dec 2025 (300,000 keywords; Ahrefs says AI Overviews correlate with a 58% lower CTR). | Ahrefs (2026-02-04) | [REPORT] |
| 10 | **$145-$169 / month** | Median monthly revenue of indie products tracked on TrustMRR (payment-provider-connected revenue). Only ~6% of the earning ones reach $10K MRR; >50% of tracked startups show no revenue. | Indie Hackers post (2026-03-12); BigIdeasDB (2026-07-03) | [REPORT] (weak: selection bias) |
| 11 | **+77% vs +14%** | Mobile game releases (Dec 2025-Feb 2026) vs games earning >$20K in March 2026. More supply, almost no more winners. | Naavik, using Sensor Tower data (2026-04-19) | [REPORT] |
| 12 | **1,000,000 / week** | New projects created on Lovable per week (Jun 2026), 50M+ total, $500M+ ARR. Was ~100,000 / day in Nov 2025. | Lovable via TechCrunch (2026-06-09); Lovable blog (2025-11-18) | [SELF-REPORTED] |
| 13 | **54%+ and ~5%** | Pre-AI baseline (July 2022): of 937 Stripe-verified Indie Hackers products, >54% earned nothing and only ~5% earned more than ~$8,333/month. | Scrapingfish analysis of Indie Hackers (2022-07-16) | [REPORT] (weak) |
| 14 | **36 million+** | New developers joining GitHub in 2025 (+23% YoY); 121M new repos; ~80% of new developers use Copilot in week one. | GitHub Octoverse 2025 (2025-10-28) | [OFFICIAL] |

Bottom line the data supports: AI coding tools exploded the *number of things built* (2-6x on most trackers) and the *number of solo founders*, but there is no evidence (yet) that the *number of people earning a living* rose in proportion. The income curve is still a steep power law, and attention (downloads, clicks, "featured" slots) is flat or shrinking.

---

## 1. Income distribution: what share of products make $0 / <$1K / >$10K

### 1a. RevenueCat State of Subscription Apps 2026 [OFFICIAL]
Source: https://www.revenuecat.com/state-of-subscription-apps and https://revenuecat.com/sosa-26-insights/ . Publication date is not printed on the page; coverage (PPC Land, SaaStr) dates it to March 2026 (PPC Land's page says article 2026-03-06 but "report released March 12" - internally inconsistent; treat as "March 2026"). Data: 115,000+ apps, $16B+ revenue, mostly 2025 performance. Scope: **only apps that use RevenueCat for subscriptions** (so apps that tried to monetize; free/ad-only/paid-upfront apps are not in the denominator -> real-world share reaching $1K is lower).

| Metric | Value | Notes |
|---|---|---|
| New apps reaching $1K MRR within 2 years | 17.3% (all categories); was 19% in prior edition | Photo & Video highest at 21.4% |
| New apps reaching $10K MRR within 2 years | 4.6%; was 5.3% in prior edition | Gaming highest, 8.9-9% (only category that improved) |
| Median time to $1K / $10K MRR (among apps that get there) | 58 days / 109 days | Gaming ~32 days to $1K; Business ~113 days |
| Monthly revenue 1 year after launch | median ~$72; top quartile >$429; top 10% >$2,574; middle 50% span $16-$429 | PPC Land calls $72 the "average"; RevenueCat page text reads as median |
| Not reaching $1K / $10K in 2 yrs | 82.7% / 95.4% | [DERIVED] 100 - 17.3; 100 - 4.6 |
| YoY MRR growth | median 5.3%; top 25% +80%; top 10% +306%; bottom 25% -33% | "winner-takes-all" |
| Revenue by app vintage | Apps launched before 2020 = 69% of all subscription revenue; launched 2025 or later = 3% | |
| Monthly new subscription-app launches | ~2,000 (Jan 2022) -> ~14,700 (Jan 2026), ~7.4x | 7.4x is [DERIVED] |
| iOS share of launches | ~77% (up from ~67% in 2023) | |
| AI-powered apps | +41% revenue per payer, but churn ~30% faster | |

Caveat for the video: the 2-year cohort in the 2026 edition mostly launched in 2023-early 2024, i.e. **before** the late-2025 agentic-coding wave. It shows the *pre-wave* baseline getting slightly worse, not the effect of the wave itself.

### 1b. Indie / bootstrapped products with payment-verified revenue (TrustMRR-based)
TrustMRR (https://trustmrr.com) is a public leaderboard where founders connect Stripe/LemonSqueezy/Polar/RevenueCat etc. to show revenue. **Selection bias both ways**: only founders who chose to list appear (many are sellers/promoters), and dead products may linger or vanish. Two independent analyses of the same source disagree on exact figures; use ranges.

| Metric | Value | Source / date / label |
|---|---|---|
| Median monthly revenue, all 5,079 tracked projects | $169 | Indie Hackers post by "oriensx", analysis date March 2026, posted 2026-03-12. https://www.indiehackers.com/post/i-analyzed-5-079-stripe-verified-startups-f0f6bd053f . [REPORT] (weak: single unreviewed post, TrustMRR API data) |
| Percentile cut-offs in that post | top 50% >$169; top 25% >~$800; top 10% >$10,000; top 1% >$98,500 | same |
| "Breaking out" (>$10K/mo AND >50% monthly growth) | 48 of 5,079 = 0.9% | same |
| Median MRR, 3,787 earning (non-zero) startups | $145 (mean $4,298) | BigIdeasDB "State of Indie SaaS Revenue 2026", updated 2026-07-03. https://bigideasdb.com/state-of-indie-saas-revenue-2026 . [REPORT] (weak: vendor; text says revenue is "self-reported by founders" to the tracking network) |
| Percentiles (earning only) | p10 $9; p25 $29; p50 $145; p75 $894; p90 $5,107; p95 $13,205; p99 $58,404 | same |
| Share of earning startups >= $1K / $10K / $50K / $100K MRR | 23.6% (895) / 6.1% (230) / 1.2% (45) / 0.58% (22) | same |
| Share of all tracked startups that earn anything | 3,787 of "8,000+" tracked -> **<47% earn anything** | [DERIVED]. (A search summary of another BigIdeasDB page said 8,699 tracked -> 43.5%; not verified.) |
| Upper bounds on share of ALL tracked reaching $1K / $10K | <= ~11% / <= ~2.9% | [DERIVED] 895/8,000 and 230/8,000 (denominator is "8,000+", so true shares are lower) |
| Median MRR by founding year | 2020: $1,200 (n=43); 2022: $948 (n=80); 2023: $514 (n=200); 2024: $235 (n=409); 2025: $168 (n=1,280) | same; partly survivorship/age, partly TrustMRR's own growth (see Part 2) |
| Median MoM growth | 0%; 64.4% of earning businesses flat or declining | same |
| Median MRR by category | Sales $640; Marketing $276; Education $208; AI $203 (n=941, most crowded); Dev tools $68 | same |
| AI is the most crowded, not the most profitable | AI = 1,245 of 5,079 projects (24.5%), median $156 vs Marketplace $1,170, Sales tools $711 | IH post above |

Discrepancy to flag: the IH post says top 10% exceed $10K/month; BigIdeasDB says only 6.1% of earning startups reach $10K MRR (and the 90th percentile is $5.1K). Different snapshots, different denominators (IH post appears to use all 5,079 listed; BigIdeasDB only non-zero, and "revenue" vs "MRR"). Safe phrasing: "roughly 6-10% of listed indie products pass $10K a month; the median is around $150."

### 1c. Pre-AI baseline: Indie Hackers products, 2022 [REPORT] (weak)
Scrapingfish, 2022-07-16, https://scrapingfish.com/blog/indie-hackers-revenue : 937 Indie Hackers products with Stripe-verified revenue; "more than 54%" make no revenue; "around 5%" make more than ~$8,333/month (~$100K/yr). Survivorship caveat acknowledged in the thread (successful founders stop posting). Not like-for-like with 1b (different population, threshold), so do NOT present as "improved" or "worsened".

### 1d. Concentration across app stores
| Metric | Value | Source | Label |
|---|---|---|---|
| Top 1% of publishers: share of 2025 IAP revenue / downloads | 92.2% / 81.0%; $154B vs $13.1B | Sensor Tower State of Mobile 2026 via Axis Intelligence (2026-08-11) https://axis-intelligence.com/mobile-app-revenue-statistics/ ; same numbers in Quantumrun (2026-08-07) | [REPORT] (weak: I could not find the primary Sensor Tower page with this table) |
| Share of IAP revenue outside the top 1%: 2019 vs 2025 | 5.3% -> 7.8% | Quantumrun https://www.quantumrun.com/consulting/mobile-app-market-growth-statistics/ | [REPORT] (weak) |
| -> implied top-1% share 2019 vs 2025 | ~94.7% -> 92.2% (slightly *less* concentrated) | | [DERIVED] |
| ~80% of global app downloads go to the top 1% of companies | | ATTN Economy via Digital Today (2026-07-02) https://www.digitaltoday.co.kr/en/view/77441/ai-vibe-coding-spurs-surge-in-mobile-game-releases-180000-launched-in-six-months | [REPORT] (weak) |
| Global 2025 IAP revenue / downloads | ~$167B (+10.6%) / ~150B (+0.8%) | Sensor Tower, https://sensortower.com/blog/state-of-mobile-2026 (Apr 2026) | [REPORT] |
| AI apps 2025 | IAP revenue >$5B (nearly 3x YoY); 3.8B downloads (2x YoY) | same | [REPORT] |
| 97% of new mobile games get <=1,000 downloads (96.68%) | | Naavik (2026-04-19, Sensor Tower data) https://naavik.co/digest/is-the-era-of-mobile-ai-slop-games-here/ | [REPORT] |

Nuance for the script: don't claim "concentration is rising." RevenueCat says old apps still hold 69% of subscription revenue; Sensor Tower-via-Quantumrun says the top-1% share ticked *down* since 2019. The robust claim is "extremely concentrated (>90%) and not diluting."

### 1e. Stripe: the top end is faster, the middle is worse
- Stripe Atlas solo-founded startups (n = "thousands" incorporated 2022-23, each with 2+ years of revenue data): median initial six-month revenue -23% YoY in 2025; top-decile +19%; top-decile/median ratio 34x (four years ago) -> 61x (2025); AI-native solo startups made "almost twice" the revenue of other solo startups by year two; top-decile solo founders earned 51% of revenue internationally vs 2% for median. Stripe blog, 2026-05-28, https://stripe.com/blog/top-solo-founder-traits . [OFFICIAL]. Note: the same page says the number of solopreneurs earning >$100K/yr "increased a third since 2022", but it links only to an X post - treat as [SELF-REPORTED] and don't use.
- Stripe 2025 annual letter (2026-02-24, https://stripe.com/newsroom/news/stripe-2025-update): companies reaching $10M ARR within 3 months of launch = double the 2024 count; 20% of Atlas startups charged their first customer within 30 days (8% in 2020); 25% of new Delaware corporations are created via Atlas; 2025 cohort grew ~50% faster than 2024 cohort. [OFFICIAL]
- Stripe 2024 letter via TechCrunch (2025-02-27): top-100 AI companies hit $5M annualized revenue in 24 months (2024 data) vs 37 months for top-100 SaaS (2018 data). https://techcrunch.com/2025/02/27/stripe-ceo-says-ai-startups-are-growing-faster-than-saas-ever-did-and-calling-them-wrappers-misses-the-point . [OFFICIAL] via [MEDIA]. Elite-end metric - not indie-typical.
- Stripe Atlas hit 100,000 all-time incorporations; Q1 2026 +130% YoY (posted by Patrick Collison 2026-05-01; reported by MindStudio 2026-05-07, secondary) https://www.mindstudio.ai/blog/stripe-atlas-130-percent-startup-incorporations-q1-2026 . [MEDIA] (weak)

---

## 2. How many builders: supply explosion

### 2a. Apps
| Metric | Value | Source (date) | Label |
|---|---|---|---|
| New App Store apps per year, 2016 peak | ~890,000 | TechSpot via search snippet (page 403 on fetch) https://www.techspot.com/news/113213-apple-app-store-inundated-low-quality-vibecoded-apps.html | [MEDIA] (weak) |
| New App Store apps 2016 -> 2024 | -48% (declining for 8 yrs) | Sensor Tower via Gizmodo (2026-04-06) https://gizmodo.com/apple-app-store-experiences-surge-in-new-apps-amid-vibe-coding-boom-2000742653 | [REPORT] |
| Implied 2024 level | ~460,000 | 890k x 0.52 = 463k; 600k / 1.30 = 462k - two routes agree | [DERIVED] |
| New App Store apps 2025 | ~600,000 (+30%); TNW says 557,000 submissions "largest since 2016" | NYT/Sensor Tower via 9to5Mac (2026-07-20) https://9to5mac.com/2026-07-20/report-app-store-added-nearly-as-many-new-apps-in-h1-2026-as-in-all-of-2025/ ; TNW (2026-04-05) https://thenextweb.com/news/vibe-coding-apple-app-store-surge-crackdown | [REPORT] (two figures differ: 557k vs ~600k) |
| New App Store apps Q1 2026 | 235,800, +84% YoY (fastest growth in four years) | The Information / Sensor Tower via Gizmodo (2026-04-06) | [REPORT] |
| New App Store apps H1 2026 | ~560,000, "roughly double" the prior period; annualized ~1.1M | NYT/Sensor Tower via 9to5Mac | [REPORT]; annualization [DERIVED]. ("On pace for >1M, beating 2016's record" is an outlet's extrapolation, not Sensor Tower's.) |
| Sensor Tower iOS launches YoY | Dec 2025 +56%; Jan 2026 +54.8% | TNW (2026-04-05) | [REPORT] (weak, secondary) |
| Appfigures: app releases Q1 2026 YoY | +60% (App Store + Google Play), +80% (iOS only); April 2026 to date +104% (both), +89% (iOS) | TechCrunch (2026-04-18) https://techcrunch.com/2026/04/18/the-app-store-is-booming-again-and-ai-may-be-why/ | [REPORT] (no absolute counts given) |
| Timing of the jump | MacStories ties a late-2025 surge to the release of Claude Opus 4.5 | https://www.macstories.net/linked/coding-agents-are-reshaping-the-app-store/ | [MEDIA] (correlation, not proof) |
| App Store downloads | 2025: 35.4B (+3%); H1 2026: 17.6B (+2%) | 9to5Mac / Sensor Tower | [REPORT] |
| Supply vs demand | new apps ~2x vs downloads +2% | | [DERIVED] |
| Apple App Review submissions reviewed | 2024: >7.7M; 2025: >9.1M (+18%); rejected: >1.9M (2024), >2M (2025: 1.2M new apps + ~800K updates) | Apple Newsroom 2025-05-27 https://www.apple.com/newsroom/2025/05/the-app-store-prevented-more-than-9-billion-usd-in-fraudulent-transactions/ and 2026-05-20 https://apple.com/newsroom/2026/05/the-app-store-stopped-over-2-point-2-billion-usd-in-fraudulent-transactions-in-2025/ | [OFFICIAL]; +18% [DERIVED]. Includes updates, so not "new apps". |
| New developers welcomed by Apple | 2024: ">220,000 developers published their first app"; 2025: "over 306,000 new developers" (+39%) | same two Apple pages | [OFFICIAL]; wording differs between years, so the +39% [DERIVED] is indicative only |
| Apple developer accounts terminated for fraud | 146,000 (2024) -> 193,000 (2025) | same | [OFFICIAL] |
| Review time (post-surge) | Historical 24-48h; March 2026 submissions reportedly 7 to 30+ days | TNW (2026-04-05) [MEDIA] (weak). Apple's spokesperson says it reviews "90 percent of submissions within 48 hours" (9to5Mac quoting NYT, 2026-07-20) - the two conflict. |
| New subscription-app launches / month (RevenueCat) | ~2,000 (Jan 2022) -> ~14,700 (Jan 2026) | RevenueCat SOSA 2026 | [OFFICIAL] |
| New mobile games: Sensor Tower via Naavik | +77% releases (Dec 2025-Feb 2026) but only +14% in games earning >$20K (March 2026); new iOS publishers +21%, new Android publishers +82% (Mar 2025-Feb 2026) | Naavik (2026-04-19) | [REPORT] |
| Relative "success rate" for new games | 1.14 / 1.77 = 0.64, i.e. ~-36% | | [DERIVED] (valid only if both growth rates share the same baseline; the article is not fully explicit) |
| Smartphone games released in six months to May 2026 | 181,000; iOS +118% YoY, Android +73% | ATTN Economy via Digital Today (2026-07-02) | [REPORT] (weak) |

### 2b. Launch platforms
Product Hunt, third-party tracker https://hunted.space/product-hunt-pulse (credits Product Hunt as data source; "launch" = submission; "featured" = promoted to front page). Data to 2026-10-20/21. Label [REPORT] (weak - tracker's method not documented).

| Year | Total submissions | Featured | Featured share [DERIVED] | Per day [DERIVED] |
|---|---|---|---|---|
| 2023 | 41,433 | 15,330 | 37.0% | ~114 |
| 2024 | 43,027 | 7,391 | 17.2% | ~118 |
| 2025 | 82,669 | 5,267 | 6.4% | ~227 |
| 2026 (to Oct 21, ~294 days) | 170,222 | 6,437 | 3.8% | ~579 |

- Biggest months: Jul 2026 21,487; Jun 2026 21,039; Sep 2026 19,926.
- Cross-check: Product Hunt's own "State of Tech Discovery Q2 2026" report (https://www.producthunt.com/p/general/product-hunt-s-state-of-tech-discovery-q2-2026 ; page shows no publish date, newsletter link dated 2026-08-26) says 2,345 launches in Q2 2026 vs 1,508 in Q2 2025 (+55%). That is almost exactly the tracker's *featured* count for Apr-Jun 2026 (908+833+618 = 2,359 [DERIVED]), so PH's headline "launches" appear to be featured launches only. The same report: AI = 1,111 launches (+46% YoY, ~47% of featured); Developer Tools 633 (+136%); average upvotes per launch ~190 overall, 252 for AI. Over 61% of AI-category makers were first-time launchers. [OFFICIAL]. **No upvote time series exists in anything I found - "average PH upvotes trend" cannot be stated.**
- Show HN (Hacker News): ~0.9K posts/month at ChatGPT's launch -> ~5.8K/month by Feb 2026 (6.3x); posts reaching 20+ points: 128 -> 211 (1.6x); July 2026: 4,071 Show HN submissions from 3,420 submitters = 13.5% of surviving URL stories. Original: orangecrumbs.com "Show HN" (no author/method stated), reposted at Zeli 2026-09-15 https://zeli.app/story/49712005 . [REPORT] (weak). Implied share of Show HN posts reaching 20+ points: ~14% -> ~3.6% [DERIVED from rounded figures]. A second counter cited in search results (805 -> 4,199 per month) is directionally the same but unverified.
- TrustMRR itself: tracked startups by founding year 2022: 80; 2023: 200; 2024: 409; 2025: 1,280 (BigIdeasDB). Confounded by TrustMRR's own growth - not clean evidence of supply.

### 2c. Developers and builders
| Metric | Value | Source (date) | Label |
|---|---|---|---|
| New GitHub developers in 2025 | 36M+ (+23% YoY); 180M+ total; ~1 new developer per second | GitHub Octoverse 2025 (2025-10-28) https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/ | [OFFICIAL] |
| New repos 2025 | +121M (630M total); >230 per minute | same | [OFFICIAL] |
| Commits 2025 | ~986M (+25%); merged PRs 43.2M/month (+23%) | same | [OFFICIAL] |
| New devs using Copilot in first week | ~80% | same | [OFFICIAL] |
| Public repos importing an LLM SDK | 1.1M+; 693,867 created in last 12 months (+178% YoY) | same | [OFFICIAL] |
| Octoverse 2026 | Not yet published as of 2026-10-21 (previous edition was 2025-10-28) - check back | | |
| Developers using/planning AI tools | 84% (2025) vs 76% (2024); 15% of respondents say they vibe-code, 72% don't; ~49,000 respondents (implied) | Stack Overflow Developer Survey 2025 https://survey.stackoverflow.co/2025/ai | [REPORT] |
| Solo-founder share of new startups | 23.7% (2019) -> 36.3% (H1 2025). Carta also: solo-led companies = 30% of 2024 startups but only 14.7% of priced-round cash; median days to first hire 399 solo vs 480 multi-founder. Carta says AI "has expanded what individuals can accomplish." | Carta Solo Founders Report, 2025-12-09, https://carta.com/data/solo-founders-report/ (read directly) | [REPORT] (US companies on Carta; VC-leaning sample) |
| Same trend, other Carta cuts | 2016: ~18% -> 2025: ~36% (Carta post dated 2026-02-18, seen in a search snippet only); 2026 Founder Ownership report: ~36% in 2025 vs 31% in 2024 (search summary; page 403). Older cut: 35% in 2024 (Founder Ownership Report 2025, via Funds Society 2025-03-21) | | [REPORT] (weak). Note 2024 is quoted as 30%, 31% and 35% in different Carta reports - definitions differ. Use only the Dec-2025 report's 23.7% -> 36.3%. |
| Solo share of Stripe Atlas C-corps | 63% in Q2 2026 (through May 28) | Stripe blog https://stripe.com/blog/top-solo-founder-traits | [OFFICIAL] |
| Y Combinator solo share (W26) | ~11% (22 founders) | Extruct.ai via search snippet | [REPORT] (weak). Useful contrast: elite accelerators still prefer teams. |
| Lovable | ~100,000 new projects/day (Nov 2025), ARR $200M | Lovable blog 2025-11-18 https://lovable.dev/blog/one-year-of-lovable | [SELF-REPORTED] |
| Lovable (later) | "one million new projects a week"; 50M+ projects built; $500M+ ARR (was $400M in Feb 2026); users "mainly non-technical"; TechCrunch notes these are company claims | TechCrunch 2026-06-09 https://techcrunch.com/2026/06/09/lovable-says-it-has-hit-500m-in-annualized-revenue-with-1-million-new-projects-a-week/ | [SELF-REPORTED] via [MEDIA] |
| Lovable per-day equivalent | 1M/week = ~143K/day (+43% vs Nov 2025) | | [DERIVED]. A "project" is not a shipped, monetized app. |
| Replit / Cursor | 2025 Replit revenue ~$240M, 150K+ paying customers; Cursor 7M developers, >$2B annualized revenue (Mar 2026) | TNW 2026-04-05 (secondary) | [MEDIA] (weak). Replit "50M users" and Sacra estimates appear only in search summaries; unverified. |

---

## 3. Attention and distribution getting harder

| Signal | Value | Source (date) | Label |
|---|---|---|---|
| Google users click a normal result link when an AI summary shows vs not | 8% vs 15% of visits (900 US adults; browsing data March 2025; ~69K searches per secondary coverage) | Pew Research Center, 2025-07-22 https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/ | [REPORT] (Google disputes the methodology) |
| Click on a link *inside* the AI summary | ~1% of visits | same | [REPORT] |
| Session ends after that search page | 26% (with AI summary) vs 16% | same | [REPORT] |
| Position-1 desktop CTR on AI-Overview keywords | 7.3% (Dec 2023) -> 1.6% (Dec 2025); control keywords 7.6% -> 3.9%; "58% lower CTR" vs a modeled forecast. n = 300,000 keywords (150K with AIO, 150K without), Google Search Console aggregates. Earlier version (2025-04-17): 34.5% lower, n same. Position 2: -50.8%, position 10: -19.4% | Ahrefs, 2026-02-04 https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/ | [REPORT] (observational; Ahrefs sells SEO tools; MediaNama wrote "0.073%" in error - it is 7.3%) |
| Google search referrals to publishers | -33% globally, -38% in the US, year to Nov 2025; Discover -21% | Chartbeat data in Reuters Institute "Trends and Predictions 2026", via Press Gazette 2026-01-12 https://pressgazette.co.uk/media-audience-and-business-data/google-traffic-down-2025-trends-report-2026/ | [REPORT] (news publishers, not indie products - use as proof of the *mechanism* only) |
| News-related searches ending with no click to a news site | 56% (May 2024) -> 69% (May 2025) | Similarweb via Search Engine Roundtable 2025-07-03 https://www.seroundtable.com/similarweb-google-zero-click-search-growth-39706.html | [REPORT] (one-month change; Similarweb's own caveat) |
| Chance a Product Hunt submission is featured | 37% (2023) -> 17% -> 6.4% -> 3.8% (2026 YTD) | hunted.space (see 2b) | [DERIVED] from [REPORT] (weak) |
| App store demand vs supply | downloads +3% (2025), +2% (H1 2026) while new apps +30% then ~x2 | Sensor Tower via 9to5Mac | [REPORT] |
| Hacker News Show HN "hit" rate | ~14% -> ~3.6% of posts reaching 20+ points | see 2b | [DERIVED] (weak) |
| Games | 97% of new mobile games <=1,000 downloads | Naavik | [REPORT] |
| Apple review friction | review times reportedly 7-30+ days in March 2026; Apple blocked/pulled vibe-coding apps (Replit, Vibecode, Anything) under Guideline 2.5.2 | TNW 2026-04-05 | [MEDIA] (weak; conflicts with Apple's "90% within 48 hours" statement) |

Interpretation guardrail: the Pew/Ahrefs/Chartbeat numbers show that *free search traffic to websites is shrinking*; they are not studies of indie products. Product Hunt's featured share and Show HN hit rate show that *launch-platform visibility per product is shrinking*. Both are consistent with "distribution is the new bottleneck," but no single study measures "indie product discovery" directly.

---

## 4. Can indie developers earn a living? What surveys exist

No reliable, large, recent survey of "share of indie developers earning a full-time living" was found - in English or Chinese. What exists:

| Data | Value | Source | Label |
|---|---|---|---|
| Proxy: share of earning indie SaaS at >= $5K MRR | ~10% (p90 = $5,107) -> <= ~4.7% of all tracked (3,787 x 10% / 8,000) | BigIdeasDB (2026-07-03) | [DERIVED] from [REPORT] (weak). $5-10K MRR is a *guess* at "living wage" - a forum poll of indie iOS devs cited in a search summary put the full-time turning point at $5-10K MRR; unverified. |
| Proxy: new subscription apps reaching $10K MRR in 2 years | 4.6% (gross revenue; store takes 15-30%; founders may have multiple apps) | RevenueCat | [OFFICIAL] |
| 2022 baseline: Indie Hackers products making >$100K/yr | ~5% | Scrapingfish | [REPORT] (weak) |
| Stripe: solo Atlas startups | typical founder's six-month revenue falling (-23%); top decile rising (+19%) | Stripe | [OFFICIAL] |
| MicroConf State of Independent SaaS 2024 | ~469-700 respondents (sources differ); one page says 17.7% of respondents under $1,000 MRR; only founders already earning revenue were sampled; full report behind a form; I could not read the distribution | https://microconf.com/state-of-indie-saas | [REPORT] (could not verify) |
| China: Zhihu x ModelScope "AI-era developer ecosystem white paper" | 13.7% of surveyed Chinese developers are "active as independent developers"; 20.74% on teams under 50; "high income" is the 5th most-cited motivation (25.62%); 79.4% worry about turning technology into value. Released 2025-10-24. Sample size not stated on the pages I could read (a search summary said 554 developers - unverified; the PDF was too large to fetch). No income data. | iTiger repost https://www.itiger.com/news/1160903841 ; 36Kr https://www.36kr.com/p/3591015381270788 | [REPORT] (weak) |
| China: "2025 survey of 1,000+ samples" | "only about 20% of indie developers reach a stable first-tier-city salary; over half struggle to cover basic living." Original institution NOT named ("data source: internet"); tier table is an image. | 36Kr / CSDN article, 2025-12-11 https://www.36kr.com/p/3591015381270788 | [MEDIA] (weak - cite only as "one Chinese media report", or skip) |
| China: Steam | "of 15,000+ new games on Steam in 2025, ~40% earned under $100" | same 36Kr article, attributed only to "internet sources" | [MEDIA] (weak) |

Chinese-language gap: I found no named, methodologically described Chinese survey of indie-developer income, and no China-region App Store new-app counts (all counts above are global or iOS-global).

---

## 5. Before AI vs after AI

Cut-points: "before" = 2022-2024 (pre-agentic coding: ChatGPT Nov 2022, Cursor/Claude Code era mostly 2025); "after" = 2025-2026. The sharpest break in app-store data is late 2025 (Dec 2025 +56% YoY).

| Dimension | Before | After | Change | Source / label |
|---|---|---|---|---|
| New App Store apps / year | 2016: ~890K -> 2024: ~460K (-48%) | 2025: ~600K; H1 2026: ~560K | 2024 -> 2025 +30%; H1 2026 ~2x | Sensor Tower via Gizmodo, 9to5Mac [REPORT]; 2024 level [DERIVED] |
| New subscription-app launches / month | ~2,000 (Jan 2022) | ~14,700 (Jan 2026) | ~7.4x | RevenueCat [OFFICIAL] |
| Product Hunt submissions / year | 41,433 (2023); 43,027 (2024) | 82,669 (2025); 170,222 (2026 to Oct 21) | ~2x then ~2x again | hunted.space [REPORT] (weak) |
| Product Hunt featured share | 37% (2023); 17% (2024) | 6.4% (2025); 3.8% (2026) | 10x less likely | [DERIVED] |
| Show HN posts / month | ~0.9K (Nov 2022) | ~5.8K (Feb 2026) | 6.3x (20+ pt posts only 1.6x) | orangecrumbs via Zeli [REPORT] (weak) |
| New GitHub developers | -- | 36M in 2025, +23% YoY; 121M new repos | | Octoverse [OFFICIAL] |
| Solo share of new startups | 23.7% (2019) | 36.3% (H1 2025); 63% of Stripe Atlas C-corps (Q2 2026) | +12.6 pts (Carta); different populations | Carta [REPORT]; Stripe [OFFICIAL] |
| Stripe Atlas incorporations | -- | Q1 2026 +130% YoY; 100,000 all-time | | MindStudio [MEDIA] (weak) |
| Apple submissions reviewed | 7.7M (2024) | 9.1M (2025) | +18% | Apple [OFFICIAL]; [DERIVED] |
| App downloads | -- | +3% (2025); +2% (H1 2026) | flat | Sensor Tower [REPORT] |
| Share of new subscription apps hitting $1K MRR in 2 yrs | 19% | 17.3% | -1.7 pts | RevenueCat [OFFICIAL]; cohort mostly pre-wave |
| Share hitting $10K MRR in 2 yrs | 5.3% | 4.6% | -0.7 pts | RevenueCat [OFFICIAL] |
| Games: releases vs winners | -- | releases +77%; >$20K games +14% | winners per release ~-36% | Naavik [REPORT]; ratio [DERIVED] |
| Median first-6-month revenue, solo Atlas startups | -- | -23% (2025 vs 2024); top decile +19% | polarizing; top/median 34x -> 61x | Stripe [OFFICIAL] |
| Time-to-scale at the very top | Top-100 SaaS: 37 months to $5M annualized (2018) | Top-100 AI: 24 months (2024); companies hitting $10M ARR in <3 months doubled in 2025 | much faster for winners | Stripe letters [OFFICIAL] |
| Google click on a result link | 15% (no AI summary) | 8% (AI summary) | -47% relative | Pew [REPORT]; relative [DERIVED] |
| Position-1 organic CTR on AIO keywords | 7.3% (Dec 2023) | 1.6% (Dec 2025) | -78% | Ahrefs [REPORT]; relative [DERIVED] |
| Google search referrals to publishers | -- | -33% global / -38% US (yr to Nov 2025) | | Chartbeat via Reuters Institute [REPORT] |
| Median monthly revenue of a typical indie product | Not measurable before 2025 (no equivalent public dataset); 2022 IH sample: >54% earn $0 | TrustMRR 2026: median ~$145-$169; <47% of tracked earn anything | shape unchanged: steep power law | Scrapingfish [REPORT]; IH post / BigIdeasDB [REPORT] (weak) |
| Top-1% revenue concentration (app stores) | ~94.7% (2019) | ~92.2% (2025) | roughly unchanged | Quantumrun/Axis via Sensor Tower [REPORT] (weak); [DERIVED] |

What the table says in one sentence: after AI, *inputs* (apps, repos, launches, solo founders) rose 2-7x, *demand* (downloads) and *attention slots* (featured launches, search clicks) stayed flat or fell, and *success rates* among new entrants edged down - while the top few get faster and richer.

---

## 6. Conflicts, caveats and things you must not overclaim

1. **No like-for-like "indie income before vs after AI" exists.** RevenueCat's two editions are the only same-method comparison, and their cohorts are mostly pre-wave. Datasets from 2022 (Scrapingfish/IH) and 2026 (TrustMRR) use different populations and thresholds.
2. **Selection bias everywhere.** RevenueCat = apps that chose subscriptions + RevenueCat. TrustMRR = founders who chose to publish revenue. IH 2022 = founders who kept posting. Carta = US companies on Carta. Stripe Atlas = founders who incorporated a Delaware C-corp (57% of new Stripe companies are outside the US, per the Stripe letter).
3. **"Projects" and "launches" are not "businesses."** Lovable's 1M/week and Product Hunt's 170K are creation/submission counts; most will never charge anyone.
4. **Conflicting figures:** new App Store apps 2025: ~600K (NYT/Sensor Tower) vs 557K (TNW); solo share 2024 in Carta: 30% / 31% / 35% by report; TrustMRR $10K share: 6.1% (BigIdeasDB, of earners) vs top-10% > $10K (IH post); BigIdeasDB pages elsewhere quote a $7 and a $136 median for related cuts (I used only the $145 page I read in full); AI Overview prevalence in searches quoted at 18-43% in various sources (not verified - excluded).
5. **Appfigures vs Sensor Tower** growth numbers differ (+60/80% vs +84% in Q1 2026) because of scope (two stores vs iOS; different tracking). Say "60-84% more new apps in Q1 2026, depending on tracker."
6. **Pew, Ahrefs:** correlational; Google disputes Pew; Ahrefs sells SEO tools. Chartbeat/Similarweb are about news publishers.
7. **Company-reported AI-tool figures** (Lovable, Replit, Cursor) are self-reported and mostly relayed through secondary articles.

---

## 7. Gaps - what I could not verify

- Share of *all* indie products making exactly $0 (only partial proxies: IH 2022 >54%; TrustMRR <47% earning anything [DERIVED]).
- A published, methodologically sound survey of how many indie developers earn a full-time living (none found; MicroConf's 2024 distribution is behind a form).
- Any Chinese-language, named-institution survey of indie income; China-region App Store new-app counts; Chinese indie-developer headcount beyond the 13.7% Zhihu x ModelScope figure (sample size unconfirmed).
- Carta's 2026 Founder Ownership report and the 2016->2025 "18% -> 36%" post (Carta pages returned 403 / redirected; only the Dec-2025 Solo Founders Report was read directly).
- Primary Sensor Tower table behind the "top 1% = 92% of IAP revenue" claim.
- Product Hunt average-upvote trend over time (only a Q2 2026 snapshot exists), and whether hunted.space counts all "launches" the same way across years.
- Appfigures absolute monthly new-app counts (TechCrunch gives only percentages).
- Cursor / Replit / Bolt / Base44 user and apps-built counts from primary sources.
- Cloudflare crawl-to-referral ratios, Similarweb's 2026 zero-click update, Octoverse 2026 (due ~late Oct 2026): not searched / not yet published. Web-search budget was exhausted before these.
- Whether RevenueCat's revenue figures are gross or net of Apple/Google's 15-30% fee (page doesn't say).
- The "1 million new apps in 2026" projection is an outlet's extrapolation of H1, not a forecast by Sensor Tower.
