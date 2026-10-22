# 04 — Distribution: why building the product is the easy part

Research compiled 2026-10-21. Every number carries a label and a source. Nothing here is estimated by me unless tagged [DERIVED].

**Label key**
- [OFFICIAL] the data owner publishing its own numbers or claims (a platform, a company, Google, Xiaohongshu).
- [REPORT] a third-party study, tracker, vendor dataset or analyst write-up. Includes independent academic work.
- [SELF-REPORTED] a founder or creator stating their own numbers. Unaudited, and biased toward success.
- [MEDIA] press or blog coverage of a number I could not trace to a primary page.
- [DERIVED] arithmetic I did on numbers that are themselves sourced here.

"Verified" in this file means I opened the page (or a copy of the page) and saw the number, not that the number is audited. URLs are given in full so they can be re-checked.

---

## A. The 16 most striking numbers (ranked by punch)

| # | Number | Label | Source, date | URL | Caveat |
|---|---|---|---|---|---|
| 1 | **4%**. Share of Product Hunt launches that PH promoted to its front page in 2026 so far (6,437 of 170,223). It was 88% in 2013, 49% in 2015, 17% in 2024, 6% in 2025. | [REPORT] | Hunted Space, "Product Hunt Pulse", snapshot 2026-10-21 | https://hunted.space/product-hunt-pulse | Third-party tracker, not Product Hunt. "Launches" = every submission. See trap T1 below. |
| 2 | **3 upvotes**. Median upvotes for an indie launch in the week 2026-07-20 to 07-26. Of 5,639 PH launches with a vote count: 11.5% got zero, 40.7% got 2 or fewer, 89.6% never passed 10, only 2.1% reached 100. The top 10% of launches took 66.6% of all votes. | [REPORT] | One author ("if") on Indie Hackers, 2026-07-27 | https://www.indiehackers.com/post/the-median-indie-launch-last-week-got-3-upvotes-d1c2406a1f | Single author, dataset not independently checked. Tracked 6,837 products on 12 platforms; 97.9% of founders used exactly one platform, 80% of them Product Hunt. |
| 3 | **17.3% and 4.6%**. Share of newly launched subscription apps that reach $1K and $10K monthly revenue within 2 years. | [REPORT] | RevenueCat, State of Subscription Apps 2026 (115,000+ apps, $16B+ revenue) | https://www.revenuecat.com/state-of-subscription-apps | RevenueCat's own platform data, so it skews to apps that use RevenueCat. [DERIVED]: 82.7% of new apps do not reach $1K/month in 2 years; 95.4% do not reach $10K. |
| 4 | **7x supply, 3% of revenue**. New subscription app launches rose from about 2,000/month (Jan 2022) to 14,700+ (Jan 2026). Apps launched in 2025 or later earn 3% of subscription revenue. Apps launched before 2020 earn 69%. | [REPORT] | RevenueCat, same report | https://www.revenuecat.com/state-of-subscription-apps | RevenueCat itself calls the 2025+ cohort "the vibe coding era". Young cohorts have had less time to earn, so this is not purely a quality signal. |
| 5 | **$169/month**. Median monthly revenue across 5,079 Stripe-verified indie projects. Top 25% above ~$800, top 10% above $10,000, top 1% above $98,500. Only 48 (0.9%) are "breaking out" (over $10K/month and over 50% monthly growth). | [REPORT] | Indie Hackers post by "oriensx" using TrustMRR API data, analysis date March 2026 (posted 2026-03-12) | https://www.indiehackers.com/post/i-analyzed-5-079-stripe-verified-startups-f0f6bd053f | Single-author analysis. TrustMRR is self-selected (founders choose to list). AI-category projects (24.5% of the set) had a lower median, $156. |
| 6 | **9 of 116**. Pieter Levels' own ledger of everything he has launched: 9 "Success" (8%), 11 "Okay", 19 "Failed", 71 "N/A" (no profit goal), 6 "New". In his words: "Most things I made never succeeded or made money." | [SELF-REPORTED] | levels.io/projects, snapshot 2026-10-21 | https://levels.io/projects | His own classification. Even the most famous solo builder has a hit rate under 1 in 10 of all projects. [DERIVED]: of the 39 projects he judged Success, Okay or Failed, 9 (23%) are Success. |
| 7 | **58%** (was 34.5%). Ahrefs: an AI Overview on the results page correlates with 58% lower click-through for the #1 ranked page. On those keywords, position-one CTR went from 7.3% (Dec 2023) to 1.6% (Dec 2025). Ahrefs: "For every 100 clicks you could historically earn for a top-ranking page, Google now keeps 58." | [REPORT] | Ahrefs, 2026-02-04 (300,000 keywords; updates their 2025-04-17 study that found 34.5%) | https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/ | Correlation, desktop only, built on a forecast, not a controlled test. Ahrefs sells SEO software. |
| 8 | **8% vs 15%, and 1%**. Pew: Google users clicked a regular result in 8% of visits when an AI summary appeared vs 15% when it did not. Only 1% of visits with a summary clicked a link inside it. 26% of visits ended the browsing session vs 16% without a summary. | [REPORT] | Pew Research Center, 2025-07-22 (900 US adults, March 2025, 68,879 searches; 18% had an AI summary) | https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/ | Independent and well-sampled, but one month and US only. Google disputed the method. |
| 9 | **68.01%**. Share of US Google searches that ended with no click to the open web, Jan–Apr 2026 (60.45% in 2024). Across 75,000+ opted-in domains, Google's share of traffic fell about 8 points from June 2025 to May 2026. AI tools send "less than 1%" of all outbound traffic. | [REPORT] | SparkToro (Rand Fishkin) using Similarweb panel data, published 2026-06-09 | https://sparktoro.com/blog/in-2026-less-than-one-third-of-google-searches-still-send-a-click/ | The 2024 and 2026 numbers come from different panels (Datos vs Similarweb); the author calls the comparison "apples and oranges". Excludes the Google mobile app. |
| 10 | **-40% traffic, -80% revenue**. Tailwind Labs: docs traffic down about 40% from early 2023 while Tailwind is "more popular than ever", and revenue "down close to 80%". 75% of the engineering team laid off (Jan 2026). The docs are "the only way people find out about our commercial products." | [SELF-REPORTED] (primary); the layoff share is [MEDIA] | Adam Wathan, GitHub comment 2026-01-06; DevClass 2026-01-08 | https://github.com/tailwindlabs/tailwindcss.com/pull/2388 and https://www.devclass.com/2026/01/08/tailwind-labs-lays-off-75-percent-of-its-engineers-thanks-to-brutal-impact-of-ai/ | Wathan attributes it to AI; no independent audit. Strongest named "SEO-dependent product hit by AI" case. |
| 11 | **557K new apps in 2025, +24%**. Apple App Store new releases: ~1M (2016 peak), 424K (2023 low), 448K (2024), 557K (2025). Q1 2026 worldwide releases +60% YoY (iOS +80%); April 2026 so far +104% (both stores, partial month). | [REPORT] | Appfigures, 2025-12-05; TechCrunch 2026-04-18 citing Appfigures | https://appfigures.com/resources/insights/20251205/2-the-app-store-just-logged-its-biggest-release-year-in-nearly-a-decade and https://techcrunch.com/2026/04/18/the-app-store-is-booming-again-and-ai-may-be-why/ | AI coding tools as the cause is a "working hypothesis" (TechCrunch's words), not proven. No absolute Q1 2026 counts available. |
| 12 | **0.45 to 0.22**. Steam: first-month copies sold per pre-launch wishlist halved between 2020–22 releases (n=34) and 2023–25 releases (n=126). Wishlists still predict sales (R² 0.77 vs 0.72). | [REPORT] | Chris Zukowski, How To Market A Game, 2026-10-13 (via Inven Global 2026-10-15) | https://www.invenglobal.com/articles/27273/steam-wishlist-inflation-value-of-1-wishlist-cut-in-half-but-predictive-power-remains-unchanged | Developer-submitted Steamworks data, small samples. Games, not apps, but the same "each unit of attention buys less" story. |
| 13 | **~250 influencers, "mid six figures" a month, half the team on marketing**. Cal AI (calorie app): about 250 creators on monthly retainers, total influencer spend "mid 6 figures" in the last month, 17 staff "about half in marketing and influencer management", 20,000–30,000 downloads/day, run rate "over $35M". | [SELF-REPORTED] | Founder interview, Latka, 2025-05-15 | https://getlatka.com/companies/calai.app/interviews/cal-ai-zach-yadegari-2025 | Founder statements, unaudited; revenue figures for Cal AI vary by outlet ($30M to $50M+). Shows what "distribution as the product" costs. |
| 14 | **2 years to the first dollar; ~4 months to $1K MRR with an audience**. Marc Lou: two years before he made his first dollar online; 21 products in under 3 years; ShipFast made $40K in its first month (launched 2023-09-01). Years later, DataFast, built by the same founder with ~95,000 followers (May 2024), took "124 days to reach the first $1K MRR" with 33% early churn. | [SELF-REPORTED] via secondary | IH profile post 2024-05-18; Starter Story's AI-compiled page quoting his IH post of 2025-09-13 | https://www.indiehackers.com/post/133k-m-selling-nextjs-boiler-plates-9ef56e28d3 and https://www.starterstory.com/businesses/launch-your-startup-in-days-not-weeks-shipfast/founders | Second-hand. A search summary also said his Product Hunt launch post gave 120 days. I could not open his original posts. |
| 15 | **324 days to $400 MRR, $0 marketing budget**. Plausible Analytics: first paying subscriber 2019-05-14; 324 days to $400 MRR. One Hacker News-linked blog post (2020-04-08) brought 166 trials in its first week, more than the previous four months combined; the site had only 27,300 unique visitors in the 15 months before. | [SELF-REPORTED] | Plausible blog, as of 2021-10-25 | https://plausible.io/blog/bootstrapping-saas | Founders' own account. No per-channel share of customers published. |
| 16 | **65.9%**. Steam games released in 2025 (to 2025-10-21) that earned under $1,000: 8,388 of 12,732. | [MEDIA] | Gamalytic estimates, reported by Yahoo/GamesRadar 2025-10-21 | https://tech.yahoo.com/gaming/articles/over-5-000-games-released-152604830.html | Estimates, not Valve data; gross revenue; includes free-to-play. A headline claim that "40% earned under $100" is loosely worded in the coverage; do not use it. |

---

## 1. How successful indie products get first users and ongoing growth

### 1.1 What exists as data (and what does not)

There is no large, representative survey of indie founders' acquisition channels. What exists are (a) counts from studying many case histories, (b) small self-reported breakdowns from individual founders, (c) the MicroConf survey, which is mostly gated.

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| In a study of **100+ consumer companies**, over 50% found early users by "going where the target audience gathers" (the most common strategy); ~30% used outreach to targeted strangers (mostly marketplaces); ~20% friends and colleagues; ~10% viral content (only 5 of the 100+); ~10% physical placement; over 20% of the most successful used press. Seven strategies account for 99% of early growth; most companies get the bulk of early growth from one or two channels. | [REPORT] | Lenny Rachitsky, Lenny's Newsletter, 2022-07-26 (updated version of his 2020 post) | https://www.lennysnewsletter.com/p/consumer-business-find-first-users | Consumer startups, mostly venture-backed and large, not indie. Percentages are the author's tallies. |
| 2020 version: "most startups found their early users from just a single strategy, and no one found success from more than three." Examples: Product Hunt launch gave Loom about 3,000 users over 1–3 days; Superhuman one press piece gave 5,000+ signups. | [REPORT] | Lenny Rachitsky, 2020-05-12 | https://www.lennysnewsletter.com/p/how-the-biggest-consumer-apps-got | Per-strategy counts not published in that version. Useful as the "2020 baseline" for Product Hunt. |
| Analysis of **all 497 Indie Hackers founder interviews**: channels ranked by how many founders said they worked: 1 SEO (usually after another channel worked first), 2 product launch platforms (Product Hunt, BetaList), 3 app marketplaces (Shopify, Slack), 4 Reddit, 5 cold email, 6 "powered by" badges, 7 Hacker News. | [REPORT] | Darko Gjorgjievski, Indie Hackers, 2021-03-13 | https://www.indiehackers.com/post/11-marketing-channels-that-consistently-work-for-founders-uuUZfEtX9op80nffQGIj | Ranked by mention count, but the post does not publish the counts. A forum comment elsewhere gave counts (SEO 84, marketplaces 78, Product Hunt 78, Reddit 45) that I could not verify. Survivor bias: interviewees are successful founders. |
| Transistor (podcast hosting SaaS), trial signups in one month: **search 40%** (Google, Bing, DuckDuckGo and AI chat tools), **word of mouth 35%**, **content and community 25%**. His conclusion: "no single silver bullet"; one email to a partner produced 10–15 signups a week; his build-in-public podcast still brings weekly signups. | [SELF-REPORTED] | Justin Jackson, data for August 2024, published 2024-11-28 | https://justinjackson.ca/best-marketing-channels | One month, one product, self-categorised. The best published "where did signups come from" split I found. |
| MicroConf State of Independent SaaS 2024: just under 700 usable responses; about 70% of companies are solo founders; average month-over-month growth about 17% overall, but about 26% for enterprise, 12% SMB, **about 5% consumer**; among ad channels, Google Ads about 65% and Meta about 30% (share naming them a top-three revenue driver). | [MEDIA] | Rob Walling and Asia Orangio recalling the report on Startups for the Rest of Us, episode 721 | https://www.startupsfortherestofus.com/episodes/episode-721-7-key-takeaways-from-the-2024-state-of-independent-saas-report | Figures stated from memory by the hosts ("approximate"). The report itself is gated (https://microconf.com/state-of-indie-saas). Mostly bootstrapped B2B SaaS, so the consumer segment is small. |
| Plausible Analytics (bootstrapped, ~$1M ARR): first customers came from Indie Hackers and Hacker News; "most people now hear about Plausible from existing customers"; marketing budget $0; no affiliate programme. | [SELF-REPORTED] | Plausible blog, 2021-10-25 | https://plausible.io/blog/bootstrapping-saas | No percentages given. |

### 1.2 Product Hunt as an acquisition channel: the outcome data

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| Featured (front-page) launches per year: 15,330 (2023), 7,391 (2024), 5,267 (2025), 6,437 (2026 to 2026-10-21). Total submissions: 41,433 (2023), 43,027 (2024), 82,669 (2025), 170,223 (2026 so far). [DERIVED]: featured launches fell 66% from 2023 to 2025 while submissions doubled. Busiest day ever: 1,383 launches on 2026-10-20, only 33 of them featured. | [REPORT] | Hunted Space, snapshot 2026-10-21 | https://hunted.space/product-hunt-pulse | Third-party scrape; see trap T1. |
| 3,869 products "shipped on Product Hunt" in H1 2026, 1,602 founders profiled. Average upvotes fell from 190 (January) to 144 (H1 average); 49% of launches are AI products. Solo launches average 123 upvotes, 2–3 person teams 188, 4+ person teams 288. Hunters with 10+ hunts average 235 upvotes vs 131 for others. The author says these are correlations, not levers. | [REPORT] | "anysite" analysis posted on Product Hunt, mid-2026 | https://www.producthunt.com/p/anysite/who-actually-launched-on-product-hunt-in-2026 | Counts far fewer products than Hunted Space, so it must filter somehow (not stated). Selection effects acknowledged by the author. |
| The "3 upvotes" median week (see A2). | [REPORT] | Indie Hackers, 2026-07-27 | https://www.indiehackers.com/post/the-median-indie-launch-last-week-got-3-upvotes-d1c2406a1f | |
| Rank decides traffic: a vendor guide estimates 5,000–15,000 visitors for the top 3 of the day and under 500 outside the top 10. | [MEDIA] | Causo guide, 2026 | https://hub.causo.ai/guides/product-hunt-traffic-data-2026 | Vendor guide, no method. I only saw this via a search snippet. Do not use as a hard number. |

### 1.3 Traffic-source breakdowns published by famous indie hackers

**Not found.** I looked for Pieter Levels, Marc Lou and Plausible/Simple Analytics public dashboards and found no published source-by-source breakdown (direct / search / social). Levels does not appear to publish one; Marc Lou's DataFast docs show an illustrative table only ("t.co: 4,000 visitors" vs "This launch thread: $2,300"), which is an example, not data (https://datafa.st/learn/tweets-that-generate-sales). Plausible's own public dashboard is a JavaScript app I could not read. The closest real breakdowns are Transistor (1.1) and Plausible's narrative (1.1).

### 1.4 What fraction of indie products make money at all

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| Median $169/month across 5,079 Stripe-verified projects (see A5). Year-0 median $148; year-1 $334; year-2 $656; year-5 $2,509. [DERIVED]: the "16x" growth only counts projects that survived. | [REPORT] | oriensx, Indie Hackers, 2026-03-12 | https://www.indiehackers.com/post/i-analyzed-5-079-stripe-verified-startups-f0f6bd053f | Survivorship is built in. |
| 937 Indie Hackers products with Stripe-verified revenue: more than 54% report zero revenue; about 5% exceed ~$8,333/month. | [REPORT] | ScrapingFish, 2022-07-16 | https://scrapingfish.com/blog/indie-hackers-revenue | 2022 data. A later recount reportedly found 48.7% at zero (not verified). |
| Median time for an app that gets there to reach $1K monthly revenue: 58 days overall (Gaming 32, Business 113). Median to $10K: 109 days. Download-to-paid median conversion 2.0%. | [REPORT] | RevenueCat 2026 | https://www.revenuecat.com/state-of-subscription-apps | Medians among apps that reach the milestone; most never do (A3). |
| Steam 2025: 65.9% of releases under $1,000 (A16). | [MEDIA] | Yahoo/GamesRadar, 2025-10-21 | https://tech.yahoo.com/gaming/articles/over-5-000-games-released-152604830.html | |

---

## 2. Build in public and audience: posting volume, time to traction, audience dependence

### 2.1 Founders who published volume and follower curves

No dataset exists that links "posts per day" to "followers" across many creators. What exists is individual claims, all unaudited, several from people who sell a course or a tool about growing followers.

| Person | Claim | Label | Source, date | URL | Caveat |
|---|---|---|---|---|---|
| Natia Kourdadze | Public commitment to post about once a day for a year. Expected at most 5K followers. "It took me 8 months to reach 10,000 followers." Current count in the body 22,000+; the headline says 33,000 in under 18 months. Early boost from meme posts; reply-engagement with big accounts. | [SELF-REPORTED] | Substack, 2025-05-28 | https://natiakourdadze.substack.com/p/how-i-got-33000-followers-on-x-in | Headline and body disagree (33K vs 22K). Post is a funnel for a paid offer. Actual post count not stated. |
| Randall Kanna | "Grew my Twitter account from 300 to 37k followers from 2019 to 2020" (35K in the AMA two months later) after taking Daniel Vassallo's paid Twitter course; email list 0 to 6–7K. | [SELF-REPORTED] | Indie Hackers, 2021-01-14 and 2021-02-26 | https://www.indiehackers.com/post/i-grew-my-twitter-account-from-300-to-37k-followers-now-im-building-an-app-0e57680322 | She was launching a tool (CrowdFox) to sell follower growth. Tweet counts not given. |
| "Solopreneur Dad" | 30 to about 1,000 followers in 14 days by treating X "as a full-time job": on the busiest day ~18 posts and 250+ replies. "X growth is much more about replies than posting." Got first paying users but says it was "probably not profitable" in hours vs revenue. | [SELF-REPORTED] | Indie Hackers, 2026-05-21 | https://www.indiehackers.com/post/how-i-went-from-30-to-1-000-followers-on-x-in-14-days-94fcd933e1 | 14 days, one account, a product in the same niche as the audience. |
| Anonymous solo iOS developer | Weekly diary for 52 weeks: 13 posts, **35 lifetime views, 0 followers, 0 stars, 0 shares**. Tried SEO and "AI-answer optimisation"; no compounding. About 62% of installs from App Store search (self-measured). | [SELF-REPORTED] | Speaker Deck "Solo iOS growth diary vol 13", as of 2026-08-04 | https://speakerdeck.com/simplememo/solo-ios-growth-diary-vol-13-year-one-in-numbers-solo-ios-retrospective | One case, but the clean zero-audience counterexample: publishing is not the same as being seen. |
| Pieter Levels | "Over 300,000 X followers, built over roughly a decade starting in 2013"; X now pays him "sometimes $16,000/month". | [MEDIA] for 300K (third-party DEV post 2026-07-07); [SELF-REPORTED] for $16K | https://dev.to/idonthaveapen/failures-behind-a-420kmonth-solo-founder-i-read-all-751-of-pieter-levels-blog-posts-1h3b and https://levels.io/projects | The decade-long curve is the realistic benchmark; the 14-day and 8-month stories are the exceptions. |

### 2.2 How long before traction

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| Marc Lou: fired by Tai Lopez in Nov 2021, then "discovered the build-in-public community on Twitter"; two years to make his first dollar online; a SaaS reached $3,000 MRR and he still "felt like a failure after four years"; 21 products and 95,000 followers in under three years; $141,000/month by May 2024. Launched ShipFast on 2023-09-01. | [SELF-REPORTED] via secondary | Indie Hackers profile by Rushab Jain, 2024-05-18 | https://www.indiehackers.com/post/133k-m-selling-nextjs-boiler-plates-9ef56e28d3 | Second-hand retelling of his own story. |
| Plausible: first subscriber 2019-05-14, 324 days to $400 MRR; about nine months more to $10K MRR. | [SELF-REPORTED] | Plausible blog, as of 2021-10-25 | https://plausible.io/blog/bootstrapping-saas | Founders' own account. |
| DataFast (Marc Lou, with an existing audience): ~120–124 days to $1K MRR. | [SELF-REPORTED] via secondary | Starter Story AI-compiled page | https://www.starterstory.com/businesses/launch-your-startup-in-days-not-weeks-shipfast/founders | See A14. |
| RevenueCat: median 58 days to $1K MRR for apps that get there; only 17.3% get there in 2 years. | [REPORT] | RevenueCat 2026 | https://www.revenuecat.com/state-of-subscription-apps | |

### 2.3 How much of a launch's result depends on the founder's existing audience

**No study isolates this.** What I found:

- On Product Hunt, bigger teams, experienced hunters and founders with bigger audiences correlate with more upvotes (solo 123 vs 4+ person 288; ex-Big Tech founders' audiences 2.9x larger). The author warns these are correlations with heavy selection effects. https://www.producthunt.com/p/anysite/who-actually-launched-on-product-hunt-in-2026 [REPORT]
- The IH launch dataset suggests the outcome is mostly a function of who else launched that day and how legible the one-liner was, not demand: "A launch-day vote count was never a measure of demand." (author's conclusion) https://www.indiehackers.com/post/the-median-indie-launch-last-week-got-3-upvotes-d1c2406a1f [REPORT]
- Case evidence both ways: Plausible grew without an audience through a single Hacker News-visible post (A15) [SELF-REPORTED]; Marc Lou's launches rode a large following, yet DataFast still took about four months to $1K MRR (A14) [SELF-REPORTED]. A third-party blog says he had about 35,000 followers before ShipFast and ShipFast made roughly $250,000 in five months (https://stealwhatworks.com/blogs/news/build-in-public-strategy-dead) [MEDIA, unverified; conflicts in date with the 95,000 figure above, which is for May 2024].
- Pieter Levels (Jun 2026): indie hackers building "AI factories" that generate products have "almost none of them have money or traffic", and "nobody knows where to get either". https://levels.io/indie-hackers-ai-factories-no-money-traffic (2026-06-08) [SELF-REPORTED, relays a friend's account of a meetup, no data].

---

## 3. Content effort vs development effort

**No credible modern survey exists** on how indie developers split time between building and marketing, and none that ties the split to outcomes. I checked Indie Hackers, MicroConf, RevenueCat, Appfigures and games-industry sources.

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| The only quantified survey I could verify is from 2012: App Promo's first annual developer survey (about 102 respondents). 59% of developers' best app did not earn enough to break even. The 12% who earned $50K+ spent on average **14% of their time on marketing**; the developers who did not break even spent **under 5%** of their time promoting and 52% of those had a $0 marketing budget. | [REPORT] | VentureBeat 2012-05-04 and I Programmer 2012-05-05 (survey run 2012-04-06 to 04-22) | https://venturebeat.com/dev/ios-developers-lose-money and https://www.i-programmer.info/news/83-mobilephone/4175-how-much-do-apps-earn.html | 14 years old, small, run by a marketing firm with a stake in the answer. Causation unknown: successful apps can afford to market. The two articles differ slightly in how they report the numbers. |
| Steam: wishlists (pre-launch marketing) strongly predict first-month sales (R² 0.77 for 2020–22 releases, n=34; 0.72 for 2023–25, n=126), but each wishlist now converts to half as many first-month sales (0.45 to 0.22). | [REPORT] | Zukowski, 2026-10-13 | https://www.invenglobal.com/articles/27273/steam-wishlist-inflation-value-of-1-wishlist-cut-in-half-but-predictive-power-remains-unchanged | Games. Closest thing to "outcomes for those who market earlier". |
| Zukowski advises opening the Steam page as early as possible: "wishlists really don't age." | [REPORT] | Game World Observer, 2025-03-11 | https://gameworldobserver.com/2025/03/11/steam-page-launch-guide-wishlists-zukowski | Advice, not a measurement. |
| Advice such as "50% coding, 50% marketing" (Jon Yongfook of Bannerbear) and the "build 50% / traction 50%" rule are opinions, not survey data. | n/a | Bannerbear blog | https://bannerbear.com/blog/why-you-should-do-50-coding-and-50-marketing-as-a-solo-tech-founder | Listed so nobody mistakes them for statistics. |

Useful quotes (self-reported, not data): "distribution is not some magical thing that happens after you build. For small internet businesses, distribution is part of the product now." (IH, 2026-05-21, https://www.indiehackers.com/post/how-i-went-from-30-to-1-000-followers-on-x-in-14-days-94fcd933e1). And Cal AI's team split (A13): of 17 staff, about half do marketing and influencer management.

---

## 4. How distribution changed in the AI era

### 4.1 AI search and fewer clicks (studies, newest first)

| Study | Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|---|
| SparkToro/Similarweb | 68.01% of US Google searches zero-click, Jan–Apr 2026 vs 60.45% in 2024. "Any click" searches fell 9.51 points (-22.9%). Only 0.34% of searches reached AI Mode. Google's share of traffic across 75,000+ opted-in domains down ~8 points (about -22%) Jun 2025 to May 2026. | [REPORT] | 2026-06-09 | https://sparktoro.com/blog/in-2026-less-than-one-third-of-google-searches-still-send-a-click/ | Cross-panel comparison. |
| Agarwal and Sen (ISB, Carnegie Mellon) | First randomized field experiment: AI Overviews cut outbound organic clicks by 38% on queries where they appeared. 1,065 US desktop Chrome users, Jan–Feb 2026, pre-registered. A later revision reportedly gives 39.8% and zero-click +34.5%. | [REPORT] | SSRN working paper, April 2026; SEJ 2026-04-27 | https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6513059 and https://www.searchenginejournal.com/ai-overviews-cut-organic-clicks-38-field-study-finds/ | Not peer reviewed; desktop only. I saw 39.8% only in a search summary of PPC Land coverage. See trap T3. |
| Ahrefs | CTR for the #1 page is 58% lower with an AI Overview (Dec 2025 vs Dec 2023; 300,000 keywords); position 2 -50.8%, position 10 -19.4%. Earlier version: -34.5% (Mar 2025 vs Mar 2024). | [REPORT] | 2026-02-04 / 2025-04-17 | https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/ and https://ahrefs.com/blog/ai-overviews-reduce-clicks/ | Correlation. 99.2% of AI Overview keywords are informational. |
| Seer Interactive | Organic CTR on queries with an AI Overview: 1.76% (Jun 2024) to 0.61% (Sep 2025), -61%. Queries without one: 2.72% to 1.62%, -41%. Paid CTR on AI Overview queries -68%. Brands cited in the Overview got about 35% higher organic CTR than uncited brands (0.70% vs 0.52%). | [REPORT] | Seer, published 2025-11-04 (3,119 queries, 42 client organisations) | https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-september-2025-update | Agency client data; the article contains internal inconsistencies, so use only the headline numbers. Authors say they cannot prove citation causes clicks. |
| Pew | 8% vs 15% click rate; 1% click on the cited source; 26% vs 16% end the session. | [REPORT] | 2025-07-22 | https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/ | See A8. |
| Similarweb | Zero-click share of news-related searches rose from 56% (May 2024) to 69% (May 2025); news-site organic visits fell from 2.3B+ to under 1.7B. Similarweb's own page says organic visits to news sites fell 26% since AI Overviews launched and ChatGPT referrals to publishers grew 25x. | [MEDIA] for 56/69 (SE Roundtable 2025-07-03); [OFFICIAL] for -26% and 25x | https://www.seroundtable.com/similarweb-google-zero-click-search-growth-39706.html and https://www.similarweb.com/corp/reports/generative-ai-publishers/ | News publishers, not indie products. |
| Google | Counter-claim: total organic click volume "has been relatively stable year-over-year", clicks are "slightly more quality clicks", traffic is shifting between sites. No data published. | [OFFICIAL] | Liz Reid, Google blog, 2025-08-06 | https://blog.google/products/search/ai-search-driving-more-queries-higher-quality-clicks/ | The one named counter-source. Cite alongside the studies for fairness. |

### 4.2 SEO-dependent indie products hit

| Case | Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|---|
| Tailwind Labs | -40% docs traffic since early 2023, revenue down close to 80%, 75% of engineers laid off (A10). | [SELF-REPORTED] | 2026-01-06 | https://github.com/tailwindlabs/tailwindcss.com/pull/2388 | |
| Pieter Levels | 2026-07-26 on X: "I'm seeing a trend here of declining revenue and traffic with indiehackers", "on my own projects too", "BigAI is cannibalizing everything that used to be apps". No numbers. | [SELF-REPORTED] via aggregator | Digg summary of his X post https://x.com/levelsio/status/2081372113307402730 | https://digg.com/ai/19e8l8dn | I could read the Digg page only, not X. An analysis site estimated Interior AI traffic fell by about half in two months (Semrush) but that is unverified. |
| Chegg | Said non-subscriber traffic was "-49%" in Jan 2025 and sued Google over AI Overviews on 2025-02-24. | [MEDIA] | Search Engine Land and others, Feb 2025 | https://searchengineland.com/google-sued-by-chegg-over-ai-overviews-hurting-traffic-and-revenue-452518 | Could not open the page; baseline of the 49% is not clear. Large edtech company, not indie. |
| Indie Hackers consensus piece | An unsourced claim that Google referrals halved for some indie products. | [MEDIA] | blog.mean.ceo | https://blog.mean.ceo/?p=11175 | No primary source. Do not use. |

AI chat as a replacement channel is still tiny: SparkToro says AI tools send "less than 1%" of outbound traffic (2026-06). Transistor counts "AI chat tools recommending Transistor" inside its 40% search share (1.1) [SELF-REPORTED].

### 4.3 Short video, creators, "UGC/faceless" marketing for apps

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| Appfigures lists "viral growth on TikTok and Instagram" via creator partnerships and UGC as a driver letting new apps reach top charts organically, alongside AI coding tools and subscriptions. | [REPORT] | Appfigures, 2025-12-05 | https://appfigures.com/resources/insights/20251205/2-the-app-store-just-logged-its-biggest-release-year-in-nearly-a-decade | Qualitative; no share-of-growth number. |
| Cal AI: influencers are the biggest channel (~250 on retainers, total spend "mid 6 figures" a month, largest creator "tens of thousands per month for four posts"); founder's own X posts (28M and 40M views) also drove reach; App Store keywords in name and subtitle; 20–25% of new users start a paid plan or trial in the first session. Creators choose the video concepts. | [SELF-REPORTED] | Latka interview, 2025-05-15 | https://getlatka.com/companies/calai.app/interviews/cal-ai-zach-yadegari-2025 | The page never says "faceless" or "UGC" about Cal AI's own mix. I found no verified data that faceless accounts specifically drove its growth. |
| **Xiaohongshu says indie development is a growing category.** 2025-03-05: "nearly 10,000" active creators who are independent developers, 7 million+ topic discussions, indie-development posts +124% in a year. 2025-04-15 (first indie-developer competition, 1,355 projects entered): 50,000+ indie developers active, indie-development content +146% on the year, related topics read 500 million+ times. | [OFFICIAL] | TMTPost 2025-03-05 and PingWest 2025-04-15, quoting the platform | https://www.tmtpost.com/7482486.html and https://www.pingwest.com/w/303938 | The two sets use different metrics (active creators vs active developers; discussions vs reads), so do not chain them into a "10,000 to 50,000" growth story. Platform marketing numbers. |
| Chinese indie developers describe using Xiaohongshu for cold-start, validation and feedback (examples: 胃之书, Podwise, Action&Link). | [MEDIA] | PingWest, 2025-04-16 | https://www.pingwest.com/a/303947 | Anecdotal, no conversion numbers. |
| Douyin / TikTok view-to-install conversion for indie apps | **Not found.** I found no verified conversion rate. | | | |

### 4.4 App Store competition after the AI app surge

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| Apple App Store new releases per year: ~1M (2016), 731K (2017), 474K (2018), 491K (2020), 434K (2022), 424K (2023), 448K (2024), **557K (2025, +24%)**. | [REPORT] | Appfigures, 2025-12-05 | (URL in A11) | Estimates. "AI-built apps are not competitive on features or experience, yet many are still being published" (Appfigures). |
| Q1 2026: worldwide releases +60% YoY, iOS +80%; April 2026 (partial): +104% both stores, +89% iOS. Utilities moved to #2 category, Productivity entered the top five. | [REPORT] | TechCrunch citing Appfigures, 2026-04-18; Startup Fortune 2026-04-28 | https://techcrunch.com/2026/04/18/the-app-store-is-booming-again-and-ai-may-be-why/ | Percentages only. |
| Sensor Tower is reported to count a higher rise (new App Store listings +84% YoY in Q1 2026 to ~235,800; +30% to nearly 600K for full 2025). | [MEDIA] | Search-summary of MacStories/The Information coverage | https://www.macstories.net/linked/coding-agents-are-reshaping-the-app-store/ | I could not open a Sensor Tower primary. MacStories itself says treat such reports with "a large grain of salt". |
| Supply vs revenue: see A3 and A4. Subscription app launches 7x since 2022; 2025+ apps earn 3% of revenue. | [REPORT] | RevenueCat | https://www.revenuecat.com/state-of-subscription-apps | |
| Apple has claimed that about 65% of App Store downloads happen directly after a search (first stated around WWDC 2016, repeated since). | [MEDIA] | Phiture 2016; eMarketer 2026 repeats it | https://phiture.com/asostack/aso-monthly-2-june-2016-99b191f11256/ | Old claim, never re-verified by me against an Apple primary. One solo developer measured ~62% of his installs from App Store search (section 2.1, anonymous iOS developer). |

### 4.5 Product Hunt's decline and changes

See 1.2 and A1. Short version: front-page share fell from 88% (2013) to 4% (2026 YTD); submissions quadrupled between 2024 and 2026 YTD; median indie launch gets 3 upvotes; average upvotes per launch fell from 190 to 144 within H1 2026; Product Hunt's own year-in-review or official launch totals could not be found.

### 4.6 Reddit as a channel

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| Reddit is the #1 cited domain on Perplexity (4% share), #2 on ChatGPT Search (13%), #3 on Google AI Mode (9%). Sample: 217,000 prompts, 248,000 unique Reddit URLs cited. Median cited post has 5–8 upvotes and 11–19 comments; 80% of cited posts have under 20 upvotes; average post age about 900 days; Q&A threads are over half of citations. | [REPORT] | Semrush, data refreshed October 2025, published 2025-11-10 | https://www.semrush.com/blog/reddit-ai-search-visibility-study/ | Semrush sells SEO tools; two sections of the article give slightly different shares. Citations are not traffic. |
| Reddit ranks 4th in the Indie Hackers analysis of 497 founder interviews as a channel that worked. | [REPORT] | 2021-03-13 | https://www.indiehackers.com/post/11-marketing-channels-that-consistently-work-for-founders-uuUZfEtX9op80nffQGIj | Old; ranking only. |

---

## 5. Showing your face

**No data exists on how many top indie hackers show their face, and no verified controlled data on face vs faceless creator accounts.** What I could verify:

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| 1.1 million Instagram photos: photos with a face were 38% more likely to get likes and 32% more likely to get comments. The number of faces, age and gender made no measurable difference. | [REPORT] | Georgia Tech and Yahoo Labs (Bakhshi, Shamma, Gilbert), CHI 2014; press release 2014-03-20 | https://www.news.gatech.edu/news/2014/03/20/face-it-instagram-pictures-faces-are-more-popular | 2014, photos on Instagram, not founder or product content. |
| LinkedIn: personal founder/executive accounts earned a median 520 impressions per post vs 244 for company pages (2.1x), in the same programmes and period. Panel: 33 profiles (30 personal, 3 company pages), 1,202 posts, Jan–Aug 2026. Top 5% of posts drove 66% of impressions. | [REPORT] | RevBoss "Founder-Led Marketing Benchmarks", published August 2026 | https://www.revboss.com/founder-led-marketing-benchmarks | Vendor with a commercial interest. Only 3 company pages, so the authors call it directional. It tests person vs brand, not face vs no face. |
| Claims that faceless accounts now make up 30%+ of viral videos or 45% of fast-growing YouTube channels circulate widely. | [MEDIA] | autofaceless.ai, easyviral.ai blogs | https://autofaceless.ai/blog/faceless-content-creator-statistics-2026 | Vendors selling faceless-content tools; no method or named source. **Do not use.** |

[DERIVED] observation (qualitative, not data): the best-documented solo successes in this file (Levels, Marc Lou, Randall Kanna, the Plausible founders) built their audience under their own names. The stand-out faceless-adjacent case, Cal AI, paid hundreds of creators with faces and also used the founder's own viral posts.

---

## 6. Why posts get engagement: what indie-hacker posts perform

**No published dataset compares revenue screenshots, failure stories and build updates.** The pieces I could verify:

| Finding | Label | Source, date | URL | Caveat |
|---|---|---|---|---|
| Buffer (via a secondary write-up): X median engagement about 2.5% vs LinkedIn about 6.2%; text-only posts 3.56% vs posts with links 2.25%; ordinary (non-Premium) X accounts' median engagement hit 0% in some months; accounts that reply to comments beat their own baseline (about +30% LinkedIn, +42% Threads), from an analysis of nearly 2 million posts. | [MEDIA] | stealwhatworks.com citing Buffer's State of Social Media Engagement 2026 | https://stealwhatworks.com/blogs/news/build-in-public-strategy-dead | I could not open Buffer's report; numbers are the blog's quotes. |
| "Solopreneur Dad" scraped top build-in-public posts: the best performers were asking founders what they are building, small controversial questions, talking about growth itself, and encouragement; "much less 'content strategy' than I expected". | [SELF-REPORTED] | Indie Hackers, 2026-05-21 | https://www.indiehackers.com/post/how-i-went-from-30-to-1-000-followers-on-x-in-14-days-94fcd933e1 | His own small analysis, no numbers. |
| LinkedIn format: multi-image posts led (median 1,042 impressions, 3.61% engagement, n=34); text-only n=690 at 508 impressions, 1.76%. | [REPORT] | RevBoss, August 2026 | https://www.revboss.com/founder-led-marketing-benchmarks | Directional; B2B client accounts, not indie hackers. |
| Engagement is not conversion: one analysis found "very little credible evidence" that publishing a revenue number converts strangers into customers. One poster reported six months of MRR updates produced followers but no paying customers. | [MEDIA] | stealwhatworks.com | https://stealwhatworks.com/blogs/news/build-in-public-strategy-dead | Anecdotal. |
| Levels' June 2026 post "Indie hackers build fancy AI factories but have no money or traffic" drew 296,541 views, 2,696 likes, 164 reposts, 93 replies (as shown on the page). | [SELF-REPORTED] | levels.io, 2026-06-08 | https://levels.io/indie-hackers-ai-factories-no-money-traffic | One data point: a post about the problem outperformed a typical build update by a large factor, but I have no baseline for his posts. Do not claim it proves a pattern. |

---

## 7. Could not verify, or not found (do not put these in the film)

1. **MicroConf "SEO and word of mouth tie at 65% as highest-impact channels" and "27.6% run no paid advertising"** appeared in a search summary; I could not find either on any MicroConf page I opened. Discarded. The report itself is gated.
2. **How many top indie hackers show their face**, and any controlled face vs faceless engagement dataset. Not found.
3. **A published source-by-source traffic breakdown for Pieter Levels, Marc Lou or any Plausible/Simple Analytics public dashboard.** Not found.
4. **Revenue-screenshot vs failure-story vs build-update engagement data.** Not found.
5. **LigoSocial's "1,209 posts from 15 build-in-public creators; only 3.6% reached 10x their median likes; format, length and timing mostly did not matter"**: the page returned 403 / a bot challenge, so this is search-summary only. Do not use unless re-checked at https://ligosocial.com/research/x-build-in-public-outliers.
6. **Any modern survey of indie developers' time split between building and marketing.** Only the 2012 App Promo survey was verifiable.
7. **How much a launch depends on existing audience** as a quantified effect. Not found.
8. **Douyin / TikTok view-to-install conversion for indie apps; UGC cost claims** (e.g. "30 UGC videos for about $1,000" attributed to Cal AI's CMO via an agency blog). Search-summary only.
9. **Cal AI acquired by MyFitnessPal (TechCrunch, 2026-03-02) and an alleged App Store removal in 2026**: seen only as headlines on a Starter Story teaser page. Unverified.
10. **Semrush "Reddit = 40.1% of AI citations" (June 2025)**: search-summary only; use the verified October 2025 figures instead.
11. **A later Seer update showing organic CTR on AI Overview results rising from 1.3% (Dec 2025) to 2.4% (Feb 2026)**: search-summary only, which would soften the "AI Overviews keep killing clicks" arc. Needs a check before any "clicks are still falling" claim in 2026.
12. **Datos/SparkToro "State of Search" reporting 22.4% zero-click in March 2026** (a different definition from the 68% above): search-summary only. Needs checking before quoting a single zero-click number.
13. **Product Hunt traffic decline from Semrush (2.93M visits in Nov 2025, -22% month on month)**: search-summary only.
14. Product Hunt's own official year-in-review or launch totals: not found.
15. The Indie Hackers analysis of 497 interviews: the per-channel counts are not in the post.

---

## 8. Traps and conflicts between sources

- **T1: Product Hunt launch counts do not agree.** Hunted Space counts every submission (170,223 so far in 2026; 18K in the last 30 days). The "anysite" analysis counts 3,869 products in H1 2026. The IH weekly dataset counted 5,639 PH launches with votes in one week. Definitions differ (submitted vs listed vs voted). Safest framing: "featured share of submissions fell from 88% to 4% (Hunted Space)" and "median launch got 3 upvotes in the week of Jul 20, 2026 (one author's tracker)". Do not combine the three.
- **T2: Hunted Space totals change by snapshot** (an earlier cached copy showed 479,059 total launches and a 27.7% all-time feature rate; the 2026-10-21 snapshot shows 595,772 and 23.0%). Quote the snapshot date.
- **T3: the number 34.5% appears twice for unrelated things**: Ahrefs' 2025 CTR drop (34.5%) and the 2026 randomized experiment's zero-click increase (34.5%, per secondary coverage). Do not mix them up. Ahrefs has since updated to 58%.
- **T4: Pew vs Ahrefs vs Seer measure different things** (share of visits with a click; CTR of the #1 result; CTR in Search Console data). Do not average them. A clean line: "every independent study since 2025 points the same direction; Google says clicks are stable but has published no data."
- **T5: Cal AI revenue** is quoted as $30M, $35M, $40M and $50M+ depending on the outlet and date. Use only "founder says run rate over $35M, May 2025".
- **T6: Marc Lou's follower numbers by date**: ~35,000 before ShipFast (third-party blog, unverified), 95,000 in May 2024 (IH profile), 127,000+ on DataFast's homepage (search-summary), 323K+ in a 2026 profile (search-summary). Always state the date.
- **T7: Xiaohongshu's two indie-developer data sets use different metrics** (see 4.3).
- **T8: Natia Kourdadze's post** states 33,000 in the headline and 22,000+ in the body.
- **T9: Hacker News median score of 2 points** applies to **all** HN posts (384,871 posts, Nov 2024 to Nov 2025), not to Show HN. A search summary mislabelled it as Show HN. Source: https://pithandpip.com/blog/hn-is-human (a single author's BigQuery query).
- **T10: TrustMRR and Indie Hackers datasets are self-selected** (founders choose to list), so the real distribution of all indie products is almost certainly worse than $169/month median.

---

## 9. Suggested spine for "building is the easy part" (all numbers above verified)

1. Supply exploded: 7x more subscription apps per month since 2022; +24% new App Store apps in 2025, +60% Q1 2026; Product Hunt submissions up from 43K (2024) to 170K (2026 so far).
2. Attention did not grow: front-page share 88% to 4%; median launch 3 upvotes; Steam first-month sales per wishlist halved; zero-click Google searches 68%; AI Overviews cut #1 CTR by 58%.
3. So outcomes concentrate: $169 median monthly revenue; 17.3% of new apps reach $1K/month in two years; Levels' own hit rate 9 of 116.
4. The people who do break out buy or build distribution as the product: Cal AI's ~250 creators and half-marketing team; Marc Lou's two years of building publicly before his first dollar; Levels' decade of posting; Plausible's single HN-visible post and 324 days to $400 MRR.
5. The old shortcut (SEO / docs / launch sites) is weakening: Tailwind -40% traffic and -80% revenue; Levels: "BigAI is cannibalizing everything that used to be apps" (July 2026).
6. 升华 candidate (from the verified material, not a number): the product is the ticket to the lottery, not the prize. A solo developer who published 13 diary posts for a year got 35 views in total; a founder who spent 14 days replying 250 times in a day got 1,000 followers and called it unprofitable. Attention is a second, separate piece of work, and nobody can build it for you.
