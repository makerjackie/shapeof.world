"""Rebuild the checked-in table with Python and CoolProp==8.0.0. No web dependency."""
import CoolProp,CoolProp.CoolProp as C,json,pathlib
assert CoolProp.__version__ == "8.0.0", "Use the pinned version to reproduce this table"
root=pathlib.Path(__file__).resolve().parent
fluid='R32';eta=.72;superheat=5;subcool=3
es=[-35+i*2.5 for i in range(28)];cs=[20+i*2.5 for i in range(21)]
fields=['h1','h2s','h2','h3','t2','rho1','s1','s2','s3','s4']
def sample(e,c):
 pe=C.PropsSI('P','T',e+273.15,'Q',1,fluid);pc=C.PropsSI('P','T',c+273.15,'Q',0,fluid)
 h1=C.PropsSI('H','P',pe,'T',e+273.15+superheat,fluid);s1=C.PropsSI('S','P',pe,'T',e+273.15+superheat,fluid)
 h2s=C.PropsSI('H','P',pc,'S',s1,fluid);h2=h1+(h2s-h1)/eta
 h3=C.PropsSI('H','P',pc,'T',c+273.15-subcool,fluid)
 return [h1,h2s,h2,h3,C.PropsSI('T','P',pc,'H',h2,fluid)-273.15,C.PropsSI('D','P',pe,'T',e+273.15+superheat,fluid),s1,C.PropsSI('S','P',pc,'H',h2,fluid),C.PropsSI('S','P',pc,'H',h3,fluid),C.PropsSI('S','P',pe,'H',h3,fluid)]
cells=[]
for e in es:
 row=[]
 for c in cs:row.append([round(v,7) for v in sample(e,c)] if c>e else None)
 cells.append(row)
sat=[]
for i in range(43):
 t=-35+i*2.5;p=C.PropsSI('P','T',t+273.15,'Q',0,fluid)
 sat.append([t,p,*[C.PropsSI(prop,'T',t+273.15,'Q',q,fluid) for prop,q in [('H',0),('H',1),('S',0),('S',1)]]])
verification=[]
for e,c in [(5,45),(8.7,46.2),(-8.2,36.3),(15.1,54.4)]:verification.append({'evaporating':e,'condensing':c,'values':sample(e,c)})
data={'source':{'package':'CoolProp','version':CoolProp.__version__,'revision':CoolProp.__gitrevision__,'url':'https://coolprop.org/','license':'MIT','fluid':fluid,'backend':'HEOS','generated':'2026-10-30','description':'Offline PropsSI property surface; SI units except temperature outputs in degrees C. No CoolProp runtime is shipped.'},'etaIsentropic':eta,'superheat':superheat,'subcool':subcool,'evaporating':es,'condensing':cs,'fields':fields,'cells':cells,'saturationFields':['temperatureC','pressurePa','hLiquidJkg','hVaporJkg','sLiquidJKgK','sVaporJKgK'],'saturation':sat,'verification':verification}
(root/'refrigerant-data.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(data['source']);print('grid',len(es),len(cs),'sample5/45',dict(zip(fields,sample(5,45))))
