/** Entertainment only: deliberately unrelated to abundance, danger or scientific value. */
export function cardRating(symbol:string):number {
 if(['Fe','Cu','C','Si','Al','O','H'].includes(symbol))return 5
 return 1+[...symbol].reduce((sum,c)=>sum+c.charCodeAt(0)*17,0)%5
}
export function CardRating({symbol,locale,note=false}:{symbol:string;locale:'zh'|'en';note?:boolean}){
 const stars=cardRating(symbol)
 return <span className="pm-card-rating" data-stars={stars} title={locale==='en'?'Entertainment rating, not rarity or scientific value':'娱乐星级，不代表稀有度或科学价值'}><span role="img" aria-label={String(stars)+(locale==='en'?'-star card · entertainment rating':' 星卡 · 娱乐设定')}>{'★'.repeat(stars)}<i>{'☆'.repeat(5-stars)}</i></span>{note&&<small>{locale==='en'?'Entertainment rating':'娱乐星级'}</small>}</span>
}
