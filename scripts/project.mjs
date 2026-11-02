import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../project.json',import.meta.url),'utf8'));
export const repository=/^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPOSITORY||'')?process.env.GITHUB_REPOSITORY:config.repository;
const [owner,name]=repository.split('/');
export const siteUrl=name.toLowerCase()===owner.toLowerCase()+'.github.io'?`https://${owner.toLowerCase()}.github.io/`:`https://${owner.toLowerCase()}.github.io/${encodeURIComponent(name)}/`;
export const projectName=config.name;
export const userAgent=`Udhembare/2.0 (+https://github.com/${repository})`;
export function publishedDataUrls(filename){
 if(!/^[a-z0-9-]+\.json$/.test(filename))throw Error('Invalid published data filename');
 const urls=[new URL('data/'+filename,siteUrl).href];
 // Explicit optional bootstrap for the first deployment; the site's own snapshot is always preferred.
 if(process.env.BOOTSTRAP_DATA_URL)try{const bootstrap=new URL(process.env.BOOTSTRAP_DATA_URL);if(bootstrap.protocol==='https:')urls.push(new URL('data/'+filename,bootstrap.href.replace(/\/?$/,'/')).href);}catch{}
 return [...new Set(urls)];
}
