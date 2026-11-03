import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {approvedReport} from './community-approval.mjs';
import {publishedDataUrls} from './project.mjs';
const repository=process.env.GITHUB_REPOSITORY||'tosilabs/ev-balkan-web';
const headers={Accept:'application/vnd.github+json','User-Agent':'Udhembare approved community reports'};
if(process.env.GH_TOKEN)headers.Authorization='Bearer '+process.env.GH_TOKEN;
async function api(path){const r=await fetch(`https://api.github.com/repos/${repository}${path}`,{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
let previous=null;
try{previous=JSON.parse(await readFile('dist/data/community.json','utf8'));}catch{}
if(!previous)for(const url of publishedDataUrls('community.json'))try{const r=await fetch(url,{signal:AbortSignal.timeout(5000)});if(!r.ok)continue;const old=await r.json();if(Array.isArray(old.reports)){previous=old;break;}}catch{}
const byIssue=new Map((previous?.reports||[]).map(r=>[r.issue,r]));const reports=[];let complete=true;
try{
 for(let page=1;page<=5;page++){
  const issues=await api(`/issues?state=all&labels=station-approved&per_page=100&page=${page}`);
  if(!Array.isArray(issues))throw Error('Përgjigje e panjohur');
  for(const issue of issues){
   if(issue.pull_request)continue;
   const digest=createHash('sha256').update(issue.body||'').digest('hex'),old=byIssue.get(issue.number);
   if(old?.approvalVersion===1&&old.issueUpdatedAt===issue.updated_at&&old.bodySha256===digest){reports.push(old);continue;}
   const events=await api(`/issues/${issue.number}/events?per_page=100`),report=approvedReport(issue,events);
   if(report)reports.push({...report,approvalVersion:1,bodySha256:digest,issueUpdatedAt:issue.updated_at});
  }
  if(issues.length<100)break;
  if(page===5)throw Error('Raportet kalojnë kufirin e këtij importi. Nevojitet zgjerim i faqëzimit.');
 }
}catch(error){complete=false;console.log('COMMUNITY_UNAVAILABLE',error.message);}
const data=complete?{checkedAt:new Date().toISOString(),reports,complete:true}:previous?{...previous,complete:false}:{checkedAt:new Date().toISOString(),reports:[],complete:false};
await mkdir('dist/data',{recursive:true});await writeFile('dist/data/community.json',JSON.stringify(data));console.log('APPROVED_COMMUNITY_REPORTS',data.reports.length);
