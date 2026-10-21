"""Derive the United States supply-chain splits used by the follow-the-money world.

Input: BEA summary input-output accounts, 2025 sheet, "Before Redefinitions,
Producers' Prices" (71 industries, 73 commodities, millions of dollars), from
https://apps.bea.gov/industry/release/zip/MAKE-USE-IMPORTS%20(BEFORE%20REDEFINITIONS).zip
and the 2025 summary Supply table from
https://apps.bea.gov/industry/release/zip/SUPPLY-USE.zip
(files dated 2026-09-29, annual update). SHA-256 of the files used:
  IOUse_Before_Redefinitions_PRO_Summary.xlsx        06be92ac77faac88a65284337a5af86186a9ac868f1a74d5eb33d5f7db10b293
  IOMake_Before_Redefinitions_PRO_Summary.xlsx       d6e39788aeed9f3fbd00faaf024d10375735b42b8fd9f4a7a20560ebf0cc215c
  ImportMatrices_Before_Redefinitions_Summary.xlsx   0e5cf4d515430376d76cfb1bfdb61ebb6926e212044e70265675d5a993ea4219
  Supply_Summary.xlsx                                19eb0fc2e75c32f9acbaee7c5aca4977175e8ae511647635a079be199102c5b0

Usage:
  python3 -I derive_us_io.py <dir with the four xlsx files> <out.json>

Method (all money in dollars per $100 of spending):
  * Domestic use U_d = Use - Import matrix (BEA's import matrix gives the
    imported part of every use cell, valued at domestic port value).
  * Industry-technology assumption: market shares D = Make / commodity output,
    domestic industry-by-industry coefficients A_d = D (U_d / g).
  * Imported inputs per dollar of industry output a_m = column sums of the
    import matrix / g. Value added per dollar: compensation of employees,
    gross operating surplus (profits, interest, rent and depreciation) and
    taxes on production and imports less subsidies.
  * Household purchases follow the PCE column; BEA's imported PCE column is
    the direct import share. The "Other" row (noncomparable imports and the
    rest-of-world adjustment) is left out of the average basket.
  * A good bought by a household carries its own trade and transport margin
    from the Supply table: (trade + transport margins) / (basic-price supply
    + product taxes less subsidies), averaged over all buyers of that good.
    Trade margins split into wholesale and retail by the PCE weights of those
    margin commodities; car margins go to car dealers.
  * Round k receives q_k = A_d^k y_d, keeps value added, pays imports and
    passes A_d q_k upstream; results are rescaled so each split totals 100
    (BEA cell rounding leaves a residual below 0.3%).
"""
import hashlib
import json
import os
import sys
import warnings

import numpy as np
import openpyxl

warnings.filterwarnings('ignore')
HOPS = 7
YEAR = '2025'
FILES = {
    'use': ('IOUse_Before_Redefinitions_PRO_Summary.xlsx', '06be92ac77faac88a65284337a5af86186a9ac868f1a74d5eb33d5f7db10b293'),
    'make': ('IOMake_Before_Redefinitions_PRO_Summary.xlsx', 'd6e39788aeed9f3fbd00faaf024d10375735b42b8fd9f4a7a20560ebf0cc215c'),
    'imports': ('ImportMatrices_Before_Redefinitions_Summary.xlsx', '0e5cf4d515430376d76cfb1bfdb61ebb6926e212044e70265675d5a993ea4219'),
    'supply': ('Supply_Summary.xlsx', '19eb0fc2e75c32f9acbaee7c5aca4977175e8ae511647635a079be199102c5b0'),
}

SECTOR_NAMES = {
    '111CA': ('农场', 'farms'),
    '211': ('油气开采', 'oil and gas wells'),
    '213': ('采矿服务', 'mining services'),
    '22': ('水电燃气', 'utilities'),
    '23': ('建筑', 'construction'),
    '311FT': ('食品饮料厂', 'food and drink makers'),
    '313TT': ('纺织厂', 'textile mills'),
    '315AL': ('服装厂', 'apparel makers'),
    '322': ('造纸', 'paper mills'),
    '324': ('炼油厂', 'oil refineries'),
    '325': ('化工', 'chemical plants'),
    '326': ('塑料橡胶', 'plastics and rubber'),
    '331': ('钢铁有色', 'metal mills'),
    '332': ('金属制品', 'metal fabricators'),
    '334': ('电子厂', 'electronics makers'),
    '3361MV': ('汽车厂', 'car plants'),
    '3364OT': ('其他交通设备', 'other vehicle makers'),
    '42': ('批发商', 'wholesalers'),
    '441': ('汽车经销商', 'car dealers'),
    '445': ('食品店', 'grocery stores'),
    '452': ('百货超市', 'general stores'),
    '4A0': ('其他零售店', 'other retailers'),
    '481': ('航空', 'airlines'),
    '484': ('卡车运输', 'trucking'),
    '486': ('管道运输', 'pipelines'),
    '493': ('仓储', 'warehousing'),
    '511': ('出版和软件', 'publishing and software'),
    '513': ('电信', 'telecoms'),
    '514': ('数据和信息服务', 'data services'),
    '521CI': ('银行', 'banks'),
    '523': ('证券投资', 'securities and investment'),
    '524': ('保险', 'insurance'),
    '525': ('基金和信托', 'funds and trusts'),
    'HS': ('住房', 'housing'),
    'ORE': ('房东和物业', 'landlords and property'),
    '532RL': ('租赁', 'rental and leasing'),
    '5411': ('法律服务', 'legal services'),
    '5412OP': ('专业技术服务', 'professional services'),
    '5415': ('计算机设计服务', 'computer services'),
    '55': ('公司总部', 'head offices'),
    '561': ('行政支持服务', 'administrative services'),
    '562': ('废物处理', 'waste services'),
    '61': ('学校', 'schools'),
    '621': ('诊所', 'doctors and clinics'),
    '622': ('医院', 'hospitals'),
    '722': ('餐馆', 'restaurants'),
    '713': ('娱乐场所', 'recreation venues'),
    '721': ('酒店', 'hotels'),
    'GSLG': ('州和地方政府', 'state and local government'),
    '81': ('其他服务', 'other services'),
    'GSLE': ('州和地方公用企业', 'state and local utilities'),
    'GFE': ('联邦公用企业', 'federal enterprises'),
}

# id, Chinese label, English label, commodity, carries trade margin, bought at home
ITEMS = [
    ('meal', '一顿饭', 'A restaurant meal', '722', False, True),
    ('fuel', '一箱油', 'A tank of gas', '324', True, False),
    ('phone', '一部手机', 'A phone', '334', True, False),
    ('rent', '房租', 'Rent', 'HS', False, True),
    ('doctor', '看病', 'A doctor visit', '621', False, True),
    ('school', '学费', 'Tuition', '61', False, True),
    ('clothes', '一件衣服', 'Clothes', '315AL', True, False),
    ('groceries', '买食品', 'Groceries', '311FT', True, False),
    ('power', '水电燃气费', 'Utility bill', '22', False, True),
    ('car', '一辆车', 'A new car', '3361MV', True, False),
]
RETAIL = ['445', '452', '4A0']


def num(v):
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(',', '')
    return 0.0 if s in ('', '-', '---', '...') else float(s)


def sheet(path, year):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True)[year]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    codes = [str(c) if c is not None else None for c in rows[5]]
    names = rows[6]
    col = {}
    for j in range(2, len(codes)):
        key = codes[j] if codes[j] not in (None, 'None') else names[j]
        if key is not None:
            col[str(key)] = j
    body = {}
    for r in rows[7:]:
        if r[0] is None and r[1] is None:
            continue
        key = str(r[0]) if r[0] is not None else str(r[1])
        body[key] = r
    return col, body


def main():
    folder, out = sys.argv[1], sys.argv[2]
    for name, sha in FILES.values():
        digest = hashlib.sha256(open(os.path.join(folder, name), 'rb').read()).hexdigest()
        if digest != sha:
            print(f'warning: {name} SHA-256 {digest} differs from the documented file', file=sys.stderr)
    ucol, ubody = sheet(os.path.join(folder, FILES['use'][0]), YEAR)
    mcol, mbody = sheet(os.path.join(folder, FILES['make'][0]), YEAR)
    icol, ibody = sheet(os.path.join(folder, FILES['imports'][0]), YEAR)
    inds = [k for k in ucol if k not in ('Total Intermediate', 'Total Final Uses (GDP)', 'Total Commodity Output') and not k.startswith('F') and not k.startswith('T0')]
    comms = [k for k in ubody if k in mcol and k != 'Total Industry Output']
    names = {k: str(ubody[k][1]) for k in comms}
    U = np.array([[num(ubody[c][ucol[j]]) for j in inds] for c in comms])
    IMP = np.array([[num(ibody[c][icol[j]]) if c in ibody else 0.0 for j in inds] for c in comms])
    MK = np.array([[num(mbody[i][mcol[c]]) for c in comms] for i in inds])
    g = np.array([num(ubody['Total Industry Output'][ucol[j]]) for j in inds])
    V = np.array([[num(ubody[k][ucol[j]]) for j in inds] for k in ['V001', 'V003', 'V002']]) / g
    pce = np.array([num(ubody[c][ucol['F010']]) for c in comms])
    pce_m = np.array([num(ibody[c][icol['F010']]) if c in ibody else 0.0 for c in comms])
    q = MK.sum(0)
    D = np.divide(MK, q, out=np.zeros_like(MK), where=q > 0)
    Ad = D @ (np.clip(U - IMP, 0, None) / g)
    am = IMP.sum(0) / g
    leak = 1 - (Ad.sum(0) + am + V.sum(0))
    assert np.abs(leak).max() < 0.005, np.abs(leak).max()
    L = np.linalg.inv(np.eye(len(inds)) - Ad)
    ci = {c: i for i, c in enumerate(comms)}
    ii = {j: i for i, j in enumerate(inds)}
    share_m = np.divide(np.clip(pce_m, 0, None), pce, out=np.zeros_like(pce), where=pce > 0).clip(0, 1)
    scol, sbody = sheet(os.path.join(folder, FILES['supply'][0]), YEAR)

    def margin_of(code):
        row = sbody[code]
        producer = num(row[scol['T013']]) + num(row[scol['T015']])
        return (num(row[scol['Trade']]) + num(row[scol['Trans']])) / producer, num(row[scol['Trade']]) / (num(row[scol['Trade']]) + num(row[scol['Trans']]))

    wholesale_share = pce[ci['42']] / (pce[ci['42']] + sum(pce[ci[c]] for c in RETAIL + ['441']))
    used = set()

    def split(y, domestic=None):
        y = y / y.sum() * 100
        share = share_m.copy()
        if domestic is not None:
            share[domestic] = 0.0
        ym = share * y
        qk = D @ (y - ym)
        hops, total = [], np.zeros(4)
        for k in range(HOPS):
            va = V @ qk
            imp = float(am @ qk) + (float(ym.sum()) if k == 0 else 0.0)
            nxt = Ad @ qk
            order = [i for i in np.argsort(-qk) if qk[i] >= 0.05][:3]
            for i in order:
                used.add(inds[i])
            hops.append({'keep': [float(v) for v in va] + [imp], 'pass': float(nxt.sum()), 'who': [[inds[i], float(qk[i])] for i in order]})
            total += np.array(list(va) + [imp])
            qk = nxt
        tq = L @ qk
        tail = np.array(list(V @ tq) + [float(am @ tq)])
        total += tail
        scale = 100 / total.sum()
        for h in hops:
            h['keep'] = [round(v * scale, 3) for v in h['keep']]
            h['pass'] = round(h['pass'] * scale, 3)
            h['who'] = [[c, round(v * scale, 2)] for c, v in h['who']]
        return {'hops': hops, 'tail': [round(v * scale, 3) for v in tail], 'total': [round(v * scale, 3) for v in total]}

    basket = pce.copy()
    basket[ci['Other']] = 0.0
    result = {
        'source': f'BEA summary input-output accounts {YEAR}, before redefinitions, producers prices (71 industries)',
        'order': ['wages', 'surplus', 'tax', 'imports'],
        'margins': {},
        'basket': {'id': 'average', **split(basket)},
        'items': [],
    }
    for item_id, zh, en, code, with_margin, domestic in ITEMS:
        y = np.zeros(len(comms))
        y[ci[code]] = 1.0
        if with_margin:
            margin, trade_part = margin_of(code)
            result['margins'][item_id] = round(margin, 4)
            m_total = margin / (1 + margin)
            y /= 1 + margin
            trade = m_total * trade_part
            y[ci['484']] += m_total - trade
            y[ci['42']] += trade * wholesale_share
            stores = ['441'] if code == '3361MV' else RETAIL
            weights = np.array([pce[ci[c]] for c in stores])
            for c, w in zip(stores, weights / weights.sum()):
                y[ci[c]] += trade * (1 - wholesale_share) * w
        result['items'].append({'id': item_id, 'zh': zh, 'en': en, 'sector': code, **split(y, ci[code] if domestic else None)})
    missing = sorted(c for c in used if c not in SECTOR_NAMES)
    for c in missing:
        print('missing name', c, names.get(c), file=sys.stderr)
    if missing:
        sys.exit(1)
    result['sectors'] = {c: list(SECTOR_NAMES[c]) for c in sorted(used)}
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print('US basket per 100:', dict(zip(result['order'], result['basket']['total'])), 'margins', result['margins'], 'max leak', float(np.abs(leak).max()))
    for it in result['items']:
        print(it['id'], it['total'])


if __name__ == '__main__':
    main()
