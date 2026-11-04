# 金价两百年 · 数据与来源

All data was fetched 2026-11-04. On screen and in the description, sources are given **by name only (no web addresses)**. The raw files are in this folder, and `golddata.py` builds `src/g/gold_data.json`.

## The line (US$ per troy ounce)
| Years | Series | File |
|---|---|---|
| 1792–1967 | New York market price, annual average (MeasuringWorth, "The Price of Gold, 1257–Present", Officer & Williamson) | `mw_gold.tsv` |
| 1968-01 – 2000-07 | London gold price, monthly average (Deutsche Bundesbank series, datasets/gold-prices) | `datahub_gold.csv` |
| 1980-01-21 | London PM fix US$850, the 1980 record (one daily point) | — |
| 2000-08-30 – 2026-11-04 | COMEX gold futures, front-month daily close | `yahoo_gc.json` |

The line changes series twice: at 1968 and at 2000-08. The header chip names the series the head is on.
- Swing points (`p`) come from a 22% zigzag; the line's tone (gold for rises, ash or red for falls) comes from a 10% zigzag.
- The 元/克 chip (from 2002) is the price × yuan per US$ (Federal Reserve H.10 via FRED, `fred_DEXCHUS.csv`) ÷ 31.1035.
- Check: 2026-11-03, 3,940 × 6.6538 / 31.1035 = 843; the SGE Au99.99 price that day was 843.60.

## Central-bank table (tonnes, year end)
- IMF International Financial Statistics, official gold in million fine troy ounces (via DBnomics: `ifs_gold_annual.json`), × 31.1035.
- After the last IFS year:
  - China: 2,306 t at end-2025 (WGC Gold Demand Trends FY2025); 2,410 t in Sep 2026 (PBOC, 77.47 Moz).
  - Russia: 74.5 Moz at end-2025 and 73.9 Moz in Apr 2026 (Bank of Russia, via TASS).
  - Poland: 550 t (WGC).
- The USSR never reported gold to the IMF. This is footnoted for years before 1992.
- China disclosed purchases only in 2009 and 2015, so its row is starred and footnoted for 2002–2015.

## Card facts
| Card | Fact | Source |
|---|---|---|
| 1792 | US$19.39/oz | Coinage Act 1792; MeasuringWorth official price |
| 1834 | US$20.67 (20.69 in 1834, 20.67 from 1837) | Coinage Act 1834; MeasuringWorth |
| 1864 | US$42.03, annual average in greenbacks, +103% | MeasuringWorth New York market |
| 1879 | Specie payments resume, back to 20.67 | MeasuringWorth |
| 1933 | Fine up to $10,000 and/or 10 years in prison | Executive Order 6102 §9 |
| 1934 | US$35; the dollar's gold content fell to 59% (−41%); the gold price rose +69% | Gold Reserve Act; Federal Reserve history |
| 1950 | US holds 20,279 t, 65–68% of reported national holdings (excl. USSR) | IMF IFS |
| 1965 | France: 588 t (1950) → 4,182 t (1965) | IMF IFS |
| 1968-03 | London gold market closed for two weeks; two-tier market | RBA Annual Report 1968; Bordo, Monnet & Naef (NBER WP 24016) |
| 1971 | US holds 9,070 t | IMF IFS |
| 1973-05 | Monthly average 102 | Bundesbank monthly |
| 1974-12-31 | Private ownership legal again (41 years after 1933) | — |
| 1976 | 184 → 110 (monthly), −40% | Bundesbank monthly |
| 1979 | CPI +13.3% (Dec/Dec); 14.8% (Mar 1980 y/y) | BLS CPI-U (FRED `CPIAUCNS`) |
| 1980-01-21 | 850 = 24× 35 | LBMA PM fix |
| 1981 | Fed funds near 20% (19.1% monthly peak, Jun 1981) | FRED `FEDFUNDS` |
| 1982 | 315 (monthly), −63% | Bundesbank monthly |
| 1999–2002 | UK sold 395 t at an average of about $275 | HM Treasury (reported) |
| 2001-02 | 255.1 close, −70% from 850 | COMEX |
| 2004-11 | First US gold ETF (GLD) | — |
| 2008 | 1,001 on 2008-03-17; 705 on 2008-11-13 (−30%) | COMEX |
| 2008→2014 | Fed assets 0.93 → 4.49 trillion | FRED `WALCL` |
| 2011-08-05 | S&P cuts US debt from AAA to AA+ | — |
| 2011 | Close 1,888.7 on 08-22 (intraday 1,921 on 09-06) | COMEX |
| 2013-04-15 | −9.4% in a day; −13.0% over two sessions (1,564 → 1,361) | COMEX |
| 2013 | China consumption 1,176.40 t, first above India | China Gold Association (2014-02) |
| 2013 | −28% on the year, the largest since 1981 | COMEX; Reuters |
| 2015-12-17 | 1,050.8 the day after the first Fed hike since 2006 | COMEX |
| 2013→2019 | Dip buyers back to even around 2019 | 21世纪经济报道 (2019-02-20) |
| 2019-08 | About US$17 trillion of negative-yielding debt | Bloomberg Barclays Global Aggregate |
| 2020-03 | 1,674.5 → 1,477.3 (−11.8%) | COMEX |
| 2020 | Fed assets 4.16 → 7.17 trillion (2020-02-26 → 2020-06-10) | FRED `WALCL` |
| 2020-08-06 | 2,069.4 | COMEX |
| 2022-02 | About US$300bn of Russian reserves frozen | widely reported (EU, US Treasury) |
| 2022–2024 | Central banks >1,000 t a year, against a 2010–2021 average of 473 t | WGC Gold Demand Trends FY2025 |
| 2022-11 – 2024-04 | PBOC buys for 18 straight months | PBOC |
| 2024 | 45 record closes; +27.5% | COMEX (own count) |
| 2025 | 3,000 on 03-14; 4,000 on 10-07; +64% on the year | COMEX |
| 2025-06 | ECB: gold passed the euro as the second reserve asset (2024 data, market value) | ECB, The international role of the euro 2025 |
| 2025-09 | 850 × CPI = about 3,592 at the time, so the 1980 record was passed in real terms; 3,681 in Sep-2026 dollars | own calculation from CPI-U |
| 2026-01-06 | SGE Au99.99 1,003.02 元/克; brand jewellery about 1,390 元/克 | 腾讯新闻 2026-01-06 |
| 2026-01-29 | Record close 5,318.4; intraday about 5,595 | COMEX; CNBC |
| 2026-01-30 | −10.8% close to close (April contract −11.4%), the steepest since 1983; Warsh nominated | Reuters; CNBC |
| 2026-02-28 – 03-20 | US/Israeli strikes on Iran; 5,312 → 4,575 (−13.9%); March the weakest month since Jun 2013 | CNBC; WGC Gold Market Commentary Mar 2026 |
| 2026-11-04 | 4,058.3 close | COMEX |
| End | A 1971-08 dollar is worth 12.1 cents (CPI 40.8 → 336.94) | BLS CPI-U |
