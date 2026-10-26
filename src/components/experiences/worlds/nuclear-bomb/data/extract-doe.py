"""Extract public event fields only from DOE/NV-209 Rev.16, table 'Tests by Name'.
Requires pdfplumber. Usage: python extract-doe.py source.pdf events.json
Intentionally discards yield, device description and all engineering columns.
"""
import json,re,sys
from pathlib import Path
import pdfplumber

events=[]
with pdfplumber.open(sys.argv[1]) as pdf:
    for pi,page in enumerate(pdf.pages):
        words=page.extract_words()
        title=' '.join(w['text'] for w in words if w['top']<60)
        if 'By Name' not in title:continue
        dates=[w for w in words if 245<w['x0']<310 and re.fullmatch(r'\d\d/\d\d/\d{4}',w['text'])]
        for date in dates:
            row=[w for w in words if abs(w['top']-date['top'])<3]
            field=lambda lo,hi:' '.join(w['text'] for w in row if lo<=w['x0']<hi)
            ordinal=field(80,108)
            lat=field(675,735);lon=field(735,800)
            if not ordinal.isdigit():continue
            name=field(110,245).replace('\uf0bd','').strip()
            mm,dd,yyyy=date['text'].split('/')
            try: coords=[float(lon),float(lat)]
            except ValueError:coords=None
            if coords and not (-180<=coords[0]<=180 and -90<=coords[1]<=90):raise ValueError(coords)
            events.append(dict(id=f'{ordinal}-{len(events)}',name=name or f'DOE {ordinal}',date=f'{yyyy}-{mm}-{dd}',coordinates=coords,sourcePage=pi+1,testNumber=int(ordinal),location=field(405,500),country='USA'))
    assert len({e['testNumber'] for e in events})==1054, f'Incomplete extraction: {len(events)}'
    assert len(events)==1149, f'Expected 1149 detonations, found {len(events)}'
Path(sys.argv[2]).write_text(json.dumps(dict(source='https://nnss.gov/wp-content/uploads/2023/08/DOE_NV-209_Rev16.pdf',version='DOE/NV-209 Rev.16 (2015)',license='US government work / public domain',precision='Published event coordinates; no jitter',events=events),ensure_ascii=False,separators=(',',':')))
print('events',len(events),'without coordinates',sum(e['coordinates'] is None for e in events))
