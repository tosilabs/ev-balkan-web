const keys=['history-v1','favourites','settings-v2','origin','origin-mode','query'];
// GitHub Pages repositories on the same user domain share localStorage. Copy only our six known keys.
export function migrateLegacyStorage(storage){
 try{
  storage??=globalThis.localStorage;
  for(const key of keys){const next='udhembare-'+key;if(storage.getItem(next)!==null)continue;const old=storage.getItem('evb-'+key);if(old!==null){try{JSON.parse(old);}catch{continue;}storage.setItem(next,old);}}
  return true;
 }catch{return false;}
}
