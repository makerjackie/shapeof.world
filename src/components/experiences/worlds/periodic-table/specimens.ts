export const specimenOrder = ['Cu', 'S', 'Si', 'Bi', 'Hg', 'Br', 'O', 'Og']
export const specimens: Record<string, {page:string; title:string; caption:string; text:string; color:string; size:string}> = {
 Cu:{page:'copper',title:'电线里的暖红色',caption:'天然铜块 · 单质标本',text:'这块天然铜重 44 克。铜能被拉成细线，也善于导电，因此常见于电线和电机。矿石中的铜通常需要提炼，这里展示的是天然铜块。',color:'#ae6846',size:'1 × 2.5 × 3.5 cm'},
 S:{page:'sulfur',title:'黄色，是硫自己的颜色',caption:'天然硫晶体 · 单质标本',text:'这枚天然硫晶体重 5 克。硫可以以单质形式存在于自然界；黄铁矿虽然也含硫，却是铁与硫的化合物，不能当成同一种标本。',color:'#c0a03b',size:'2 × 2 × 3 cm'},
 Si:{page:'silicon',title:'芯片的起点，有金属般的光泽',caption:'高纯硅块 · 单质标本',text:'高纯硅呈灰色，表面有金属般的光泽。它用于半导体芯片。沙子中常见的石英是二氧化硅，不能把沙粒当成纯硅。',color:'#6b7d8b',size:'2 × 2 cm'},
 Bi:{page:'bismuth',title:'一层氧化膜，让金属有了彩虹',caption:'铋晶体 · 表面带氧化膜',text:'照片里的台阶状晶体由铋形成，表面覆盖氧化膜。彩色来自表面薄膜的光学效应，不代表铋内部也是彩虹色。',color:'#8e7592',size:'2 × 3 cm'},
 Hg:{page:'mercury',title:'常温下，金属也能是液体',caption:'纯汞 · 液态标本',text:'照片中的纯汞重 6 克。常温下它呈银白色液态；Hg 来自意为“液态银”的拉丁名称。照片只供观察，汞具有毒性。',color:'#82969d',size:'2 cm'},
 Br:{page:'bromine',title:'一瓶深红色的非金属',caption:'纯溴 · 密封液态标本',text:'密封瓶中是单质溴。常温下，溴与汞都是液体，但溴属于非金属。它有挥发性，真实照片保留了盛装它的玻璃瓶。',color:'#a45b42',size:'1 × 4 cm'},
 O:{page:'oxygen',title:'通电之后，无色气体显出光',caption:'氧气 · 放电发光实拍',text:'瓶中是高纯氧气。照片展示放电时的辉光，普通条件下的氧气是无色的。气体的发光照片，需要与它平常的外观区分。',color:'#a77eac',size:'1 × 5 cm'},
 Og:{page:'',title:'这件展品，无法装进展柜',caption:'没有宏观标本',text:'鿫通过核反应合成，已知同位素迅速衰变。我们没有可供拍摄的一块鿫。这个空展柜保留它在周期表中的位置，不推测它的实物外观。',color:'#86928b',size:'—'},
}
