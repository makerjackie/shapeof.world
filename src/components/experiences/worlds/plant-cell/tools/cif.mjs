/** Small mmCIF tokenizer. Quotes, semicolon text blocks and loop row boundaries are preserved. */
export function tokenizeCif(text) {
  const tokens=[]; let i=0;
  while(i<text.length){
    if(/\s/.test(text[i])){i++;continue}
    if(text[i]==='#'){while(i<text.length&&text[i]!=='\n')i++;continue}
    if(text[i]===';'&&(i===0||text[i-1]==='\n')){const start=++i;const end=text.indexOf('\n;',i);if(end<0)throw Error('Unclosed CIF text');tokens.push(text.slice(start,end).trim());i=end+2;continue}
    if(text[i]==="'"||text[i]==='"'){const quote=text[i++],start=i;while(i<text.length&&!(text[i]===quote&&(i+1===text.length||/\s/.test(text[i+1]))))i++;tokens.push(text.slice(start,i++));continue}
    const start=i;while(i<text.length&&!/\s/.test(text[i]))i++;tokens.push(text.slice(start,i));
  }return tokens;
}
export function parseCif(text){
  const t=tokenizeCif(text),categories={};let i=0;
  while(i<t.length){
    if(t[i]==='loop_'){i++;const keys=[];while(t[i]?.startsWith('_'))keys.push(t[i++]);const cat=keys[0]?.split('.')[0];if(!cat)continue;const rows=[];
      while(i<t.length&&!t[i].startsWith('_')&&t[i]!=='loop_'&&!t[i].startsWith('data_')&&t[i]!=='stop_'){
        const row={};for(const k of keys)row[k.slice(k.indexOf('.')+1)]=t[i++];rows.push(row);
      }categories[cat]=rows;
    }else if(t[i].startsWith('_')){const key=t[i++],cat=key.split('.')[0];categories[cat]??=[{}];categories[cat][0][key.slice(key.indexOf('.')+1)]=t[i++];}else i++;
  }return categories;
}
