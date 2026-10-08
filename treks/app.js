import {bands,colors,bandOf,parseGPX,formatDuration} from './routes.js';
const $=id=>document.getElementById(id);
let routes=[],filters=new Set(),selected=null,map=null,layer=null,loading=true,loadError='',warnings=[],completed=0,total=0;
const downloadIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/></svg>';
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
function safeFile(file){if(typeof file!=='string'||!/^gpx\/.+\.gpx$/i.test(file)||file.includes('\\')||file.split('/').some(p=>p==='..'||p==='.'||p==='')||file.includes('?')||file.includes('#'))throw new Error('Each route needs a local path such as gpx/dingli-loop.gpx.');return new URL(file.split('/').map(encodeURIComponent).join('/'),document.baseURI).href}
function visible(){return routes.filter(r=>!filters.size||filters.has(bandOf(r.distance)))}
function downloadLink(r,className='route-download'){const a=node('a',className);a.href=r.url;a.download=r.file.split('/').pop();a.innerHTML=downloadIcon;a.append(document.createTextNode('Download GPX'));a.setAttribute('aria-label','Download GPX for '+r.name);return a}
function fit(all=false){if(!map)return;const list=visible(),r=!all&&selected?list.find(r=>r.id===selected):null;const points=(r?[r]:list).flatMap(r=>r.segments.flat());if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:15});else map.setView([35.94,14.39],11)}
function select(id){selected=selected===id?null:id;render();fit()}
function renderFilters(){const root=$('filters');root.replaceChildren();const all=node('button','filter all '+(!filters.size?'chosen':''));all.append(document.createTextNode('All distances'),node('span','',String(routes.length)));all.setAttribute('aria-pressed',String(!filters.size));all.onclick=()=>{filters.clear();selected=null;render();fit(true)};root.append(all);bands.forEach((b,i)=>{const button=node('button','filter '+(filters.has(i)?'chosen':'')),dot=node('span','dot');dot.style.background=colors[i];button.append(dot,document.createTextNode(b.label),node('span','count',String(routes.filter(r=>bandOf(r.distance)===i).length)));button.setAttribute('aria-pressed',String(filters.has(i)));button.onclick=()=>{filters.has(i)?filters.delete(i):filters.add(i);selected=null;render();fit(true)};root.append(button)});$('clear').hidden=!filters.size}
function renderDetail(){const root=$('detail'),r=visible().find(r=>r.id===selected);root.replaceChildren();root.hidden=!r;if(!r)return;const close=node('button','detail-close','×');close.setAttribute('aria-label','Close route details');close.onclick=()=>{selected=null;render();fit(true)};root.append(close,node('span','eyebrow','SELECTED TREK'),node('h2','',r.name));const bottom=node('div','detail-bottom'),meta=node('div');const strong=node('strong','',r.distance.toFixed(1)+' ');strong.append(node('small','','km'));meta.append(strong,node('span','','GPX track distance'));if(r.durationSeconds){const duration=node('p','',formatDuration(r.durationSeconds)+' total time');duration.style.cssText='font-size:14px;font-weight:600;margin:10px 0 0';meta.append(duration)}bottom.append(meta,downloadLink(r,'download'));root.append(bottom)}
function renderMap(){if(!layer)return;layer.clearLayers();const list=visible();list.forEach(r=>{const line=L.polyline(r.segments,{color:colors[bandOf(r.distance)],weight:r.id===selected?7:4,opacity:r.id===selected?1:.82}).addTo(layer);line.on('click',()=>select(r.id));line.bindTooltip(node('div','',r.name+' · '+r.distance.toFixed(1)+' km'+(r.durationSeconds?' · '+formatDuration(r.durationSeconds)+' total time':'')),{sticky:true});L.circleMarker(r.segments[0][0],{radius:r.id===selected?7:4,color:'#fff',weight:2,fillColor:colors[bandOf(r.distance)],fillOpacity:1}).addTo(layer).on('click',()=>select(r.id))});if(selected)layer.eachLayer(l=>{if(l instanceof L.Polyline&&l.options.weight===7)l.bringToFront()})}
function render(){
 renderFilters();const list=visible(),root=$('route-list');root.replaceChildren();$('count').textContent=list.length;
 $('map-count').textContent=list.length+' '+(list.length===1?'route':'routes')+' visible'+(loading?' · loading…':'');
 $('welcome').hidden=loading||!!loadError||routes.length>0;
 if(loadError){const box=node('div','list-state');box.append(node('p','',loadError));const retry=node('button','retry','Try again');retry.onclick=load;box.append(retry);root.append(box)}
 else{
  if(loading)root.append(node('div','list-state',total?'Loading routes… '+completed+' of '+total+' processed':'Loading route collection…'));
  if(warnings.length)root.append(node('div','load-warning',warnings.length+' '+(warnings.length===1?'route could':'routes could')+' not be loaded: '+warnings.join(' • ')));
  if(!routes.length&&!loading){const empty=node('div','empty-list');empty.append(node('h3','','The collection is on its way.'),node('p','','Check back soon for routes across Malta and Gozo.'));root.append(empty)}
  else if(routes.length&&!list.length){const box=node('div','list-state');box.append(node('p','',loading?'No matching routes loaded yet.':'No routes in these ranges yet.'));const reset=node('button','','Show all routes');reset.onclick=()=>{filters.clear();render();fit(true)};box.append(reset);root.append(box)}
  else for(const r of list){const button=node('button','route-card '+(r.id===selected?'active':''));button.setAttribute('aria-pressed',String(r.id===selected));const swatch=node('div','route-swatch');swatch.style.background=colors[bandOf(r.distance)];const content=node('div','route-content'),meta=node('div');meta.style.flexWrap='wrap';meta.append(node('span','',r.distance.toFixed(1)+' km'));if(r.durationSeconds){const time=node('span','',formatDuration(r.durationSeconds));time.title='Total recorded time, including breaks';time.setAttribute('aria-label','Total recorded time: '+formatDuration(r.durationSeconds));meta.append(time)}meta.append(node('span','route-range',bands[bandOf(r.distance)].label));content.append(node('h3','',r.name),meta);button.append(swatch,content);button.onclick=()=>select(r.id);root.append(button,downloadLink(r))}
 }
 renderMap();renderDetail();
}
async function load(){
 loading=true;loadError='';warnings=[];routes=[];selected=null;completed=0;total=0;render();
 try{
  const response=await fetch('./routes.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('The route collection could not be loaded. Please try again.');
  let manifest;try{manifest=await response.json()}catch{throw new Error('The route list contains invalid JSON. Check commas between routes and remove any comma after the final route.')}
  if(!manifest||!Array.isArray(manifest.routes))throw new Error('The route collection is not configured correctly.');
  const files=new Set();const entries=manifest.routes.filter(entry=>{const file=typeof entry==='string'?entry:entry?.file;if(files.has(file))return false;files.add(file);return true});total=entries.length;render();
  await Promise.allSettled(entries.map(async(entry,index)=>{
   const item=typeof entry==='string'?{file:entry}:entry;
   try{
    const url=safeFile(item?.file);const res=await fetch(url,{cache:'no-cache'});
    if(!res.ok)throw new Error((item?.name||item?.file||'Route')+' (file unavailable)');
    const raw=await res.text();if(raw.length>20_000_000)throw new Error((item?.name||item?.file)+' (file too large)');
    const parsed=parseGPX(raw,item.file.split('/').pop());
    routes.push({...parsed,id:String(index),file:item.file,url,name:typeof item.name==='string'&&item.name.trim()?item.name.trim().slice(0,150):parsed.name});
    routes.sort((a,b)=>Number(a.id)-Number(b.id));
   }catch(e){warnings.push(e instanceof Error?e.message:'Invalid GPX file')}
   finally{completed++;render();if(!selected)fit(true)}
  }));
 }catch(e){loadError=e instanceof Error?e.message:'Routes could not be loaded. Please try again.'}
 finally{loading=false;render()}
}
$('clear').onclick=()=>{filters.clear();selected=null;render();fit(true)};$('fit').onclick=()=>{selected=null;render();fit(true)};
try{if(!window.L)throw new Error('The map could not be loaded. Please refresh.');map=L.map('map',{zoomControl:false}).setView([35.94,14.39],11);L.control.zoom({position:'bottomright'}).addTo(map);layer=L.featureGroup().addTo(map);let failures=0;const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);tiles.on('tileerror',()=>{if(++failures>3){$('map-status').hidden=false;$('map-status').textContent='Map tiles could not be loaded. Route downloads are still available.'}});tiles.on('tileload',()=>{failures=0;$('map-status').hidden=true});new ResizeObserver(()=>map.invalidateSize()).observe($('map'))}catch(e){$('map-status').hidden=false;$('map-status').textContent=e.message}
load();
