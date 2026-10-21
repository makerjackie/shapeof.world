import {experimentSymbols} from './reaction-model'
import {synthesisReactions} from './synthesis-data'
/** Curated discovery trails, not chemical families or scientific rankings. */
export const cardCollections=[
 {id:'everyday',glyph:'◇',name:'生活的骨架',nameEn:'Everyday essentials',description:'从建筑、电线到芯片，收集身边常见材料背后的元素。',descriptionEn:'Meet the elements behind buildings, wires and chips.',symbols:['Fe','Cu','Al','Si','C']},
 {id:'colour',glyph:'✧',name:'光与色的秘密',nameEn:'Light and colour',description:'铋的彩虹、铜的变化、氖的光，看看颜色从哪里来。',descriptionEn:'Explore bismuth’s rainbow, changing copper and glowing neon.',symbols:['Bi','Cu','Ne']},
 {id:'water',glyph:'◉',name:'水面上的变化',nameEn:'Changes on water',description:'让锂、钠、钾遇见水，观察气泡与金属的变化。',descriptionEn:'Observe bubbles and changing metal when lithium, sodium and potassium meet water.',symbols:['Li','Na','K']},
 {id:'experiments',glyph:'⚗',name:'变化观察员',nameEn:'Transformation observer',description:'收集带有互动变化演出的元素，再去试试它们的条件卡。',descriptionEn:'Collect elements with interactive transformations, then try their condition cards.',symbols:[...experimentSymbols]},
 {id:'nuclei',glyph:'◎',name:'原子核工坊',nameEn:'Nuclear workshop',description:'探索这些元素档案中已发表的代表性合成反应。',descriptionEn:'Explore published representative synthesis reactions in these element dossiers.',symbols:Object.keys(synthesisReactions)},
]
