const form=document.querySelector('#composer'),status=document.querySelector('#generation-status'),button=form.querySelector('button[type=submit]'),progress=document.querySelector('.generation-progress'),history=document.querySelector('#generation-history');
const controls=['instructions','model','max_tokens','temperature','style'];
function syncTemperature(){document.querySelector('#temperature-value').value=document.querySelector('#temperature').value;}
try{const saved=JSON.parse(localStorage.getItem('church-readymade-settings')||'null');if(saved)for(const key of controls){if(typeof saved[key]==='string')document.getElementById(key).value=saved[key];}}catch{}
syncTemperature();document.querySelector('#temperature').addEventListener('input',syncTemperature);
function saveSettings(){try{localStorage.setItem('church-readymade-settings',JSON.stringify(Object.fromEntries(controls.map(key=>[key,document.getElementById(key).value]))));}catch{}}
controls.forEach(key=>document.getElementById(key).addEventListener('change',saveSettings));
document.querySelector('#original-preset').addEventListener('click',e=>{document.querySelector('#instructions').value=e.currentTarget.dataset.preset;saveSettings();});
let busy=false,db,count=0;
const ready=new Promise(resolve=>{try{const opening=indexedDB.open('church-readymade-collection',1);opening.onupgradeneeded=()=>opening.result.createObjectStore('results',{keyPath:'id'});opening.onsuccess=()=>{db=opening.result;const read=db.transaction('results').objectStore('results').getAll();read.onsuccess=()=>{read.result.sort((a,b)=>a.created-b.created).forEach(renderEntry);resolve();};read.onerror=()=>resolve();};opening.onerror=opening.onblocked=()=>resolve();}catch{resolve();}});
function element(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
function downloadLink(text,href,name){const a=element('a',text);a.href=href;a.download=name;return a;}
function museumLabel(label){
 const panel=element('div',null,'museum-label');panel.append(element('p',label.artist,'label-artist'),element('p',label.bio,'label-bio'),element('h4',label.title+', '+label.year));
 const facts=element('dl');for(const [field,title] of [['medium','Medium'],['dimensions','Dimensions'],['provenance','Provenance'],['credit_line','Credit line']])facts.append(element('dt',title),element('dd',label[field]));
 panel.append(facts,element('p',label.extended_label,'extended-label'),element('small',label.extended_label.trim().split(/\s+/).length+' words · fictional artist and citation'));
 return panel;
}
function renderEntry(entry){
 const article=element('article',null,'generation'+(entry.image?'':' single'));
 const meta=element('div',null,'generation-meta');const date=element('time',new Date(entry.created).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}));date.dateTime=new Date(entry.created).toISOString();meta.append(element('span',entry.error?'Label saved · image unavailable':'Accession'),date);
 article.append(meta,element('h3',entry.prompt));const pair=element('div',null,'generation-pair'),actions=element('div',null,'generation-actions');
 if(entry.image){const src='data:image/png;base64,'+entry.image,figure=element('figure'),img=element('img');img.src=src;img.alt=entry.label?entry.label.object_description+' — '+entry.label.dimensions:entry.prompt;img.loading='lazy';img.width=1024;img.height=1024;figure.append(img);pair.append(figure);actions.append(downloadLink('Download image',src,'exhibition-'+entry.id+'.png'));}
 if(entry.label)pair.append(museumLabel(entry.label));else if(entry.result)pair.append(element('div',entry.result,'generation-response'));
 article.append(pair);
 if(entry.result)actions.append(downloadLink('Download label','data:text/plain;charset=utf-8,'+encodeURIComponent(entry.result),'label-'+entry.id+'.txt'));
 actions.append(downloadLink('Download accession JSON','data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(entry,null,2)),'accession-'+entry.id+'.json'));article.append(actions);
 if(entry.image_prompt){const detail=element('details',null,'image-prompt');detail.append(element('summary','Image prompt derived from this label'),element('pre',entry.image_prompt));article.append(detail);}
 if(entry.error)article.append(element('p',entry.error,'generation-note'));
 history.prepend(article);count++;document.querySelector('#history-count').textContent=count;document.querySelector('#nav-count').textContent=count;document.querySelector('#empty-history').hidden=true;
}
function saveEntry(entry){return new Promise(resolve=>{if(!db){resolve(false);return;}try{const tx=db.transaction('results','readwrite');tx.objectStore('results').put(entry);tx.oncomplete=()=>resolve(true);tx.onerror=tx.onabort=()=>resolve(false);}catch{resolve(false);}});}
function setStatus(message,error=false){status.textContent=message;status.dataset.error=String(error);}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;await ready;if(busy)return;
 const data=new FormData(form);if(!String(data.get('prompt')||'').trim()){setStatus('Describe an object first.',true);document.querySelector('#prompt').focus();return;}
 if(Number(document.querySelector('#remaining').textContent)<=0){setStatus('No image attempts remain on this server. Your collection is still below.',true);return;}
 busy=true;button.disabled=true;button.querySelector('span').textContent='Accessioning…';progress.hidden=false;saveSettings();setStatus('Writing the museum label, then installing its object.');
 try{
 const response=await fetch(window.location.pathname,{method:'POST',body:data,headers:{Accept:'application/json'}});
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('The server could not finish. Your collection is still here.');
 const payload=await response.json();if(Number.isInteger(payload.remaining))document.querySelector('#remaining').textContent=payload.remaining;
 if(payload.result){const entry={id:crypto.randomUUID(),created:Date.now(),prompt:data.get('prompt'),result:payload.result,label:payload.label,image:payload.image,image_prompt:payload.image_prompt,error:payload.error||null};renderEntry(entry);const saved=await saveEntry(entry);setStatus(payload.error||(saved?'Accession saved in your collection.':'Accession displayed. Download it before leaving; browser storage is unavailable.'),Boolean(payload.error));if(payload.error&&!saved)setStatus(payload.error+' Download the label before leaving; browser storage is unavailable.',true);}
 else throw new Error(payload.error||'No label came back.');
 }catch(error){setStatus(error.message||'Connection interrupted. Your collection is still here.',true);}
 finally{busy=false;button.disabled=false;button.querySelector('span').textContent='Accession object';progress.hidden=true;}
});

// Ambient motion never follows the pointer or competes with the composer.
(()=>{
 const video=document.querySelector('#ambient-video'),canvas=document.querySelector('#ambient-particles'),toggle=document.querySelector('#motion-toggle');
 if(!video||!canvas||!toggle)return;
 const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduced.matches,frame=0,last=0,w=0,h=0,dots=[];
 try{const saved=localStorage.getItem('sam-ambient-motion');if(saved==='paused')paused=true;}catch{}
 function size(){w=innerWidth;h=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);dots=Array.from({length:Math.min(72,Math.floor(w*h/16000))},()=>({x:Math.random()*w,y:Math.random()*h,r:.7+Math.random()*1.4,v:.007+Math.random()*.018,a:.25+Math.random()*.4}));draw(0);}
 function draw(delta){if(!ctx)return;ctx.clearRect(0,0,w,h);for(const p of dots){p.y-=p.v*delta;p.x+=Math.sin(p.y*.006)*delta*.002;if(p.y<0)p.y=h;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(221,226,218,${p.a})`;ctx.fill();}}
 function tick(now){if(paused||document.hidden){frame=0;return;}draw(Math.min(now-last,50));last=now;frame=requestAnimationFrame(tick);}
 function sync(){cancelAnimationFrame(frame);frame=0;toggle.textContent=paused?'Play motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused));if(paused||document.hidden){video.pause();return;}video.preload='metadata';video.play().catch(()=>{});last=performance.now();frame=requestAnimationFrame(tick);}
 toggle.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('sam-ambient-motion',paused?'paused':'playing');}catch{}sync();});
 reduced.addEventListener('change',e=>{if(e.matches){paused=true;sync();}});
 document.addEventListener('visibilitychange',sync);window.addEventListener('resize',size,{passive:true});size();sync();
})();
