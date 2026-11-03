import {TERRAIN} from './terrain.mjs?v=3.6';
const svgNode=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const label=(value,x,y,anchor='start')=>{const n=svgNode('text',{x,y,'text-anchor':anchor,fill:'#69766d','font-size':10});n.textContent=value;return n;};
export function renderProfile(container,profile,onSelect){
 container.replaceChildren();const {points,segments}=profile,W=560,H=150,L=45,R=14,T=12,B=27;
 const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'Lartësia përgjatë itinerarit. Boshti horizontal: kilometra; vertikal: metra mbi nivelin e detit.'});svg.classList.add('elevation-chart');
 const min=profile.min===null?0:Math.floor(profile.min/50)*50,max=profile.max===null?100:Math.max(min+50,Math.ceil(profile.max/50)*50),x=p=>L+(W-L-R)*p.km/profile.km,y=p=>T+(H-T-B)*(max-p.elevation)/(max-min);
 for(let i=0;i<3;i++){const height=min+(max-min)*i/2,cy=T+(H-T-B)*(1-i/2);svg.append(svgNode('line',{x1:L,x2:W-R,y1:cy,y2:cy,stroke:'#dde5d8','stroke-dasharray':'3 4'}),label(Math.round(height)+' m',L-5,cy+3,'end'));}
 for(let i=0;i<3;i++){const km=profile.km*i/2;svg.append(label(km.toFixed(1)+' km',L+(W-L-R)*i/2,H-6,i===0?'start':i===2?'end':'middle'));}
 for(const s of segments){const a=points[s.index],b=points[s.index+1],known=s.key!=='unknown';svg.append(svgNode('path',{d:known?`M${x(a)},${y(a)}L${x(b)},${y(b)}`:`M${x(a)},${H-B}L${x(b)},${H-B}`,fill:'none',stroke:TERRAIN[s.key].color,'stroke-width':known?3:2,'stroke-dasharray':known?'':'3 4'}));}
 const cursor=svgNode('line',{x1:L,x2:L,y1:T,y2:H-B,stroke:'#183f34','stroke-width':1,'stroke-dasharray':'3 3'});svg.append(cursor);
 const readout=document.createElement('p');readout.className='profile-readout';readout.setAttribute('aria-live','polite');
 const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max=String(points.length-1);slider.value='0';slider.step='1';slider.setAttribute('aria-label','Zgjidh pikë përgjatë profilit të itinerarit');
 const select=index=>{index=Math.max(0,Math.min(points.length-1,index));const p=points[index],s=segments[Math.min(index,segments.length-1)];slider.value=String(index);cursor.setAttribute('x1',x(p));cursor.setAttribute('x2',x(p));readout.textContent=`${p.km.toFixed(1)} km · ${p.elevation===null?'Lartësi e panjohur':Math.round(p.elevation)+' m'} · ${s.grade===null?'Pjerrësi e panjohur':s.grade.toFixed(1)+'%'} · ${TERRAIN[s.key].label}`;slider.setAttribute('aria-valuetext',readout.textContent);onSelect?.(p,index);};
 slider.addEventListener('input',()=>select(Number(slider.value)));
 const pick=event=>{const rect=svg.getBoundingClientRect(),px=(event.clientX-rect.left)/rect.width*W;select(Math.round((px-L)/(W-L-R)*(points.length-1)));};
 svg.addEventListener('pointerdown',pick);svg.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')pick(event);});
 container.append(svg,slider,readout);select(0);return {select};
}
