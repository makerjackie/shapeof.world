# v4 data: the price series (annual / monthly / trading days with OHLC and 元/克), central-bank tonnes,
# the Fed funds rate (monthly), US CPI inflation (12-month, monthly) and the Fed balance sheet (weekly).
import csv, json, sys, datetime as dt
R = sys.argv[1]
S = json.load(open(f"{R}/src/g/sample2_data.json"))
def yfrac(s):
    d = dt.date.fromisoformat(s)
    return round(d.year + (d.timetuple().tm_yday - 0.5) / (366 if d.year % 4 == 0 else 365), 4)
fed = [[yfrac(r["observation_date"]), float(r["FEDFUNDS"])] for r in csv.DictReader(open(f"{R}/research/fred_FEDFUNDS.csv"))]
cpi_rows = [(r["observation_date"], float(r["CPIAUCNS"])) for r in csv.DictReader(open(f"{R}/research/fred_CPIAUCNS.csv")) if r["CPIAUCNS"] not in ("", ".")]
cpi = []
for i in range(12, len(cpi_rows)):
    cpi.append([yfrac(cpi_rows[i][0]), round((cpi_rows[i][1] / cpi_rows[i - 12][1] - 1) * 100, 1)])
out = {"p": S["p"], "res": S["res"], "walcl": S["walcl"], "fed": fed, "cpi": cpi}
json.dump(out, open(f"{R}/src/g/gold4_data.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out["p"]), "fed", fed[0], fed[-1], "cpi", cpi[0], cpi[-1])
print("cpi 1979-12", [c for c in cpi if 1979.9 < c[0] < 1980.0], "1980-03", [c for c in cpi if 1980.15 < c[0] < 1980.25])
print("fed peak", max(fed, key=lambda r: r[1]))
