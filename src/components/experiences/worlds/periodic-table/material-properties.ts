// Factual values individually checked against RSC element pages on 2026-09-10.
// Original selection and summaries; no upstream application dataset or prose copied.
export interface MaterialProperties {
 melt:number; boil:number; density:number; electronegativity:number;
 config:string; shells:number[]; oxidation:string; discovery:string; uses:string;
}
export const materialProperties:Record<string,MaterialProperties>={
 Cu:{melt:1084.62,boil:2560,density:8.96,electronegativity:1.90,config:'[Ar] 3d¹⁰ 4s¹',shells:[2,8,18,1],oxidation:'+1, +2',discovery:'史前已知；铜与锡的合金青铜，曾被用来制造工具与钟。',uses:'电线、电机、屋顶与换热器。铜兼有导电、导热与延展性。'},
 S:{melt:115.21,boil:444.61,density:2.07,electronegativity:2.58,config:'[Ne] 3s² 3p⁴',shells:[2,8,6],oxidation:'−2, +2, +4, +6',discovery:'硫在古代已被认识，能以单质形式出现在火山地区。',uses:'制造硫酸，也用于橡胶硫化。硫元素与不同硫化合物的性质差别很大。'},
 Si:{melt:1414,boil:3265,density:2.3296,electronegativity:1.90,config:'[Ne] 3s² 3p²',shells:[2,8,4],oxidation:'−4, +4',discovery:'1824 年，贝采里乌斯分离出了硅。名字来自表示燧石的拉丁词。',uses:'高纯硅用于芯片与太阳能电池；含硅化合物还出现在玻璃与建筑材料中。'},
 Bi:{melt:271.406,boil:1564,density:9.79,electronegativity:1.9,config:'[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³',shells:[2,8,18,32,18,5],oxidation:'+3, +5',discovery:'铋曾被与铅、锡混淆。它常见的天然同位素铋-209具有极长的半衰期。',uses:'铋用于低熔点合金；部分铋化合物用于医药。晶体表面的氧化膜带来丰富颜色。'},
 Hg:{melt:-38.829,boil:356.619,density:13.5336,electronegativity:1.9,config:'[Xe] 4f¹⁴ 5d¹⁰ 6s²',shells:[2,8,18,32,18,2],oxidation:'+1, +2',discovery:'汞在古代已被认识。它的液态特征使它曾被用于温度计与气压计。',uses:'历史上用于测温、测压与汞合金。由于毒性，许多用途已被其他材料替代。'},
 Br:{melt:-7.2,boil:58.8,density:3.1028,electronegativity:2.96,config:'[Ar] 3d¹⁰ 4s² 4p⁵',shells:[2,8,18,7],oxidation:'−1, +1, +3, +5, +7',discovery:'1826 年，巴拉尔发表了溴的发现；勒维希也曾独立获得这种物质。',uses:'溴化银用于传统感光材料；部分含溴化合物用于阻燃。用途对应化合物，并不等于单质溴。'},
 O:{melt:-218.79,boil:-182.962,density:.001308,electronegativity:3.44,config:'[He] 2s² 2p⁴',shells:[2,6],oxidation:'−1, −2',discovery:'普里斯特利与舍勒分别制得氧气；拉瓦锡帮助解释了它在燃烧中的作用。',uses:'氧气用于炼钢与医疗供氧。常温氧气无色，放电辉光与低温液氧的颜色是不同条件下的现象。'},
}
export function materialPhase(symbol:string,temperature:number):'固态'|'液态'|'气态'|'相变边界'|'未知' {
 const p=materialProperties[symbol]
 if(!p)return '未知'
 if(temperature===p.melt||temperature===p.boil)return '相变边界'
 return temperature<p.melt?'固态':temperature<p.boil?'液态':'气态'
}
export function sortedSpecimens(symbols:string[],order:'collection'|'melt'|'density'){
 return order==='collection'?[...symbols]:[...symbols].sort((a,b)=>(materialProperties[a]?.[order]??Infinity)-(materialProperties[b]?.[order]??Infinity))
}
