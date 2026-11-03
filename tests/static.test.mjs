import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
test('Every DOM id referenced by the app exists exactly once',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'Duplicate IDs in document');
  const all=app+'\n'+readFileSync(new URL('../dist/journey-ui.mjs',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../dist/interface.mjs',import.meta.url),'utf8');
  for(const match of all.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),`Missing DOM element ${match[1]}`);
});
test('PWA and linked local assets are packaged for subdirectory hosting',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  for(const m of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g))assert.ok(existsSync(new URL('../dist/'+m[1].split('?')[0],import.meta.url)),`Missing asset ${m[1]}`);
});
test('Station metadata uses DOM text nodes instead of HTML injection',()=>{
  assert.ok(!/\.innerHTML\s*=/.test(app));
  assert.ok(app.includes('node.textContent=value'));
});
