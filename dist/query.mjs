const plain=value=>value.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
export function interpretQuery(value){
 const original=String(value).trim(),s=plain(original);
 const power=s.match(/(?:mbi|minimum|min\.?|>=)\s*(\d{1,4})\s*(?:kw)?|\b(\d{1,4})\s*kw\b/);
 const connector=/\bccs(?:2)?\b/.test(s)?'CCS2':/type\s*2|tipi?\s*2/.test(s)?'Type 2':null;
 if(!power&&!connector&&!/\b(gjej|karikues|mbushes)\b/.test(s))return null;
 // Mask constraints before locating the place, so "në punë pranë Shkupit" keeps the town.
 const masked=s.replace(/\bne pune\b|24\s*\/\s*7/g,m=>' '.repeat(m.length));
 const markers=[...masked.matchAll(/\b(?:ne|per|prane)\s+/g)],last=markers.at(-1);
 let place=last?original.slice(last.index+last[0].length):'';
 place=place.replace(/\s+(?:mbi|minimum|min\.?|>=)\s*\d.*$/i,'').replace(/\s+(?:ccs2?|type\s*2|tipi?\s*2).*$/i,'').replace(/\s+n[eë]\s+pun[eë].*$/i,'').replace(/\s+24\s*\/\s*7.*$/i,'').trim();
 return {place,power:power?Number(power[1]||power[2]):null,connector,route:/gjate\s+rruges|pergjate\s+rruges/.test(s),active:/\bne pune\b/.test(s),open24:/24\s*\/\s*7/.test(s)};
}
