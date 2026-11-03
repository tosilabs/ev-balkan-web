import {stationReport} from '../dist/community.mjs';
export function approvedReport(issue,events,now=Date.now()){
 if(issue.pull_request||!issue.labels?.some(l=>l.name==='station-approved'))return null;
 const changes=(Array.isArray(events)?events:[]).filter(e=>['labeled','unlabeled'].includes(e.event)&&e.label?.name==='station-approved').sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
 const approval=changes.at(-1),approvedAt=Date.parse(approval?.created_at),updatedAt=Date.parse(issue.updated_at);
 // Edits after approval require the reviewer to remove/reapply the label.
 if(approval?.event!=='labeled'||!Number.isFinite(approvedAt)||!Number.isFinite(updatedAt)||updatedAt>approvedAt)return null;
 const match=issue.body?.match(/<!-- udhembare-report-v1 -->\s*```json\s*([\s\S]*?)```/);if(!match)return null;
 try{
  const raw=JSON.parse(match[1]),observed=Date.parse(raw.observedAt);
  if(raw.consent!=='CC BY 4.0'||!Number.isFinite(observed)||observed>now+300000)return null;
  const report=stationReport(raw);
  return {...report,observedAt:new Date(observed).toISOString(),issue:issue.number,url:issue.html_url,approvedAt:approval.created_at,author:issue.user?.login||'Kontribues'};
 }catch{return null;}
}
