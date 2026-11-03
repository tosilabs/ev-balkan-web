import {point} from './core.mjs?v=3.3';
export function stationReport(raw){
 const location=point(raw.lat,raw.lon);const kind=['missing','works','fault','correction','review'].includes(raw.kind)?raw.kind:'correction';
 const name=String(raw.name||'').trim().slice(0,160);if(!name)throw Error('Shkruaj emrin e lokacionit.');
 const power=raw.power===''||raw.power==null?null:Number(raw.power);if(power!==null&&(!Number.isFinite(power)||power<0||power>1000))throw Error('Fuqia nuk është e vlefshme.');
 const rating=raw.rating?Number(raw.rating):null;if(rating!==null&&(!Number.isInteger(rating)||rating<1||rating>5))throw Error('Vlerësimi duhet të jetë 1–5.');
 return {schema:1,kind,name,...location,stationId:String(raw.stationId||'').slice(0,240),operator:String(raw.operator||'').slice(0,140),connector:['CCS2','Type 2','CHAdeMO','unknown'].includes(raw.connector)?raw.connector:'unknown',power,rating,note:String(raw.note||'').trim().slice(0,2000),observedAt:String(raw.observedAt||new Date().toISOString()).slice(0,50),consent:'CC BY 4.0'};
}
export function reportUrl(report){const body='Raport për verifikim nga Udhëmbarë. Të dhënat dhe fotot që dorëzoj janë të miat ose kam të drejtë t’i publikoj, nën CC BY 4.0.\n\n<!-- udhembare-report-v1 -->\n```json\n'+JSON.stringify(report,null,2)+'\n```\n\nFoto mund të bashkëngjiten këtu para dërgimit. Raporti bëhet publik vetëm pasi e dërgon nga GitHub; në hartë publikohet pas verifikimit.';return 'https://github.com/tosilabs/ev-balkan-web/issues/new?title='+encodeURIComponent(`[Stacion] ${report.name}`)+'&body='+encodeURIComponent(body);}
