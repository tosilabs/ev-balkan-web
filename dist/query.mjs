export function interpretQuery(value){
 const original=String(value).trim(),s=original.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');const power=s.match(/(?:mbi|minimum|min\.?|>=)\s*(\d{1,3})\s*(?:kw)?|\b(\d{1,3})\s*kw\b/);const connector=/\bccs(?:2)?\b/.test(s)?'CCS2':/type\s*2|tipi?\s*2/.test(s)?'Type 2':null;
 const structured=Boolean(power||connector||/\b(gjej|karikues|mbushes)\b/.test(s));if(!structured)return null;
 const marker=/\b(?:ne|per|prane)\s+(.+)$/u.exec(s),place=marker?original.slice(marker.index+marker[0].indexOf(marker[1])).replace(/\s+(?:mbi|minimum|min\.?|>=)\s*\d.*$/i,'').replace(/\s+(?:ccs2?|type\s*2|tipi?\s*2).*$/i,'').trim():'';
 return {place,power:power?Number(power[1]||power[2]):null,connector,route:/gjate\s+rruges|pergjate\s+rruges/.test(s),active:/\bne pune\b/.test(s),open24:/24\s*\/\s*7/.test(s)};
}
