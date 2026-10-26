import type { BridgeKind } from './model'

export type BridgeExample = {
  id: string; kind: BridgeKind; name: string; short: string; span: number; year: number;
  country: string; structure: string; distinction: string; source: string; extraSource?: string;
}
/** Hand-entered facts only; sources and span conventions are documented in SOURCES.md. */
export const BRIDGE_EXAMPLES: BridgeExample[] = [
  { id: 'humen-aux', kind: 'beam', name: '虎门大桥辅航道桥', short: '虎门辅桥', span: 270, year: 1997, country: '中国', structure: '预应力混凝土连续刚构', distinction: '建成时同类桥跨度世界纪录', source: 'https://www.yantian.gov.cn/ytdayszxxw/lsjt/content/post_11736982.html', extraSource: 'https://zgglxb.chd.edu.cn/CN/article/downloadArticleFile.do?attachType=PDF&id=1246' },
  { id: 'shibanpo', kind: 'beam', name: '石板坡长江大桥复线桥', short: '石板坡', span: 330, year: 2006, country: '中国', structure: '钢混组合连续刚构', distinction: '建成时同类桥跨度世界纪录', source: 'https://fzggw.cq.gov.cn/zwxx/bmdt/202002/t20200212_5171489.html' },
  { id: 'pingnan', kind: 'arch', name: '平南三桥', short: '平南三桥', span: 575, year: 2020, country: '中国', structure: '钢管混凝土拱桥', distinction: '建成时拱桥跨度世界纪录', source: 'https://www.gxlq.com.cn/html/2020/qiyeyaowen_0113/7297.html', extraSource: 'https://dkgqgczx.gxu.edu.cn/info/1007/1002.htm' },
  { id: 'tiane', kind: 'arch', name: '天峨龙滩特大桥', short: '天峨龙滩', span: 600, year: 2024, country: '中国', structure: '劲性骨架混凝土拱桥', distinction: '建成时拱桥跨度世界纪录', source: 'https://jtj.xuancheng.gov.cn/News/show/1539540.html' },
  { id: 'qingzhou', kind: 'stayed', name: '港珠澳大桥青州航道桥', short: '青州航道', span: 458, year: 2018, country: '中国', structure: '钢箱梁斜拉桥', distinction: '中国代表桥', source: 'https://www.hzmb.gov.hk/sc/main-bridge.html', extraSource: 'https://www.td.gov.hk/mini_site/atd/2019/tc/section1_1.html' },
  { id: 'sutong', kind: 'stayed', name: '苏通长江公路大桥', short: '苏通', span: 1088, year: 2008, country: '中国', structure: '钢箱梁斜拉桥', distinction: '建成时斜拉桥跨度世界纪录', source: 'https://jtyst.jiangsu.gov.cn/art/2008/4/14/art_41358_7515323.html', extraSource: 'https://jtt.hunan.gov.cn/jtt/jjzdgz/xxds/dsgs/202206/t20220609_25441686.html' },
  { id: 'husutong', kind: 'stayed', name: '沪苏通长江公铁大桥', short: '沪苏通', span: 1092, year: 2020, country: '中国', structure: '钢桁梁公铁两用斜拉桥', distinction: '首座主跨超千米的公铁两用斜拉桥', source: 'https://wap.sasac.gov.cn/n2588025/n2588124/c14992281/content.html', extraSource: 'https://www.js.msa.gov.cn/art/2025/12/30/art_275_1580720.html' },
  { id: 'yangsigang', kind: 'suspension', name: '杨泗港长江大桥', short: '杨泗港', span: 1700, year: 2019, country: '中国', structure: '双层钢桁梁悬索桥', distinction: '建成时双层悬索桥跨度世界纪录', source: 'https://www.hunan.gov.cn/hnszf/hnyw/zwdt/201910/t20191012_10480616.html' },
  { id: 'akashi', kind: 'suspension', name: '明石海峡大桥', short: '明石海峡', span: 1991, year: 1998, country: '日本', structure: '钢桁梁悬索桥', distinction: '建成时悬索桥跨度世界纪录', source: 'https://www.jb-honshi.co.jp/english/corp_index/technology/introduction/introduction_akashi.html' },
  { id: 'canakkale', kind: 'suspension', name: '恰纳卡莱 1915 大桥', short: '恰纳卡莱', span: 2023, year: 2022, country: '土耳其', structure: '双箱梁悬索桥', distinction: '运营方公布的悬索桥跨度世界纪录', source: 'https://www.1915canakkale.com/kurumsal/sikca-sorulan-sorular', extraSource: 'https://www.1915canakkale.com/basin-odasi/zaman-tuneli/1915canakkale-halkimizin-ve-dunyanin-hizmetinde' },
]
