import {writeFile,mkdir} from 'node:fs/promises';
import {stationReport} from '../dist/community.mjs';
import {publishedDataUrls} from './project.mjs';
const repository=process.env.GITHUB_REPOSITORY||'tosilabs/ev-balkan-web',reports=[];let complete=true;
try{for(let page=1;page<=5;page++){const r=await fetch(`https://api.github.com/repos/${repository}/issues?state=all&labels=station-approved&per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'Udhembare approved community reports'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);const issues=await r.json();if(!Array.isArray(issues))throw Error('Përgjigje e panjohur');for(const issue of issues){if(issue.pull_request)continue;const match=issue.body?.match(/<!-- udhembare-report-v1 -->\s*```json\s*([\s\S]*?)```/);if(!match)continue;try{const raw=JSON.parse(match[1]);if(raw.consent!=='CC BY 4.0')continue;const report=stationReport(raw);if(!Number.isFinite(Date.parse(report.observedAt)))continue;reports.push({...report,issue:issue.number,url:issue.html_url,approvedAt:issue.updated_at,author:issue.user?.login||'Kontribues'});}catch{}}if(issues.length<100)break;}}
catch(error){complete=false;console.log('COMMUNITY_UNAVAILABLE',error.message);}
let data={checkedAt:new Date().toISOString(),reports,complete};
if(!complete)for(const url of publishedDataUrls('community.json'))try{const r=await fetch(url,{signal:AbortSignal.timeout(5000)});const old=await r.json();if(Array.isArray(old.reports)){data={...old,complete:false};break;}}catch{}
await mkdir('dist/data',{recursive:true});await writeFile('dist/data/community.json',JSON.stringify(data));console.log('APPROVED_COMMUNITY_REPORTS',data.reports.length);
