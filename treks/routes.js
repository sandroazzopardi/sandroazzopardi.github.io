export const bands = [{ label: 'Under 5 km', min: 0, max: 5 }, { label: '5–10 km', min: 5, max: 10 }, { label: '10–20 km', min: 10, max: 20 }, { label: '20–30 km', min: 20, max: 30 }, { label: '30–50 km', min: 30, max: 50 }, { label: '50–70 km', min: 50, max: 70 }, { label: '70–100 km', min: 70, max: 100 }, { label: '100 km+', min: 100, max: Infinity }];
export const colors = ['#da532c', '#197e78', '#9a5bb4', '#3064bf', '#a56b13', '#cb3c80', '#447b2e', '#5745b8'];
export function bandOf(km) { return bands.findIndex(b => km >= b.min && km < b.max); }
export function distanceOf(segments) { let d = 0; const rad = Math.PI / 180; for (const seg of segments)
    for (let i = 1; i < seg.length; i++) {
        const [a, b] = seg[i - 1], [c, e] = seg[i];
        const h = Math.sin((c - a) * rad / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin((e - b) * rad / 2) ** 2;
        d += 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
    } return d; }
export function parseGPX(raw, fallback) { const doc = new DOMParser().parseFromString(raw, 'text/xml'); if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'gpx')
    throw new Error('This file is not valid GPX.'); const nodes = (root, tag) => Array.from(root.getElementsByTagNameNS('*', tag)); const containers = [...nodes(doc.documentElement, 'trkseg'), ...nodes(doc.documentElement, 'rte')]; const segments = containers.map(s => nodes(s, s.localName === 'rte' ? 'rtept' : 'trkpt').map(pt => { const la = pt.getAttribute('lat'), lo = pt.getAttribute('lon'); const x = Number(la), y = Number(lo); if (la === null || lo === null || !Number.isFinite(x) || !Number.isFinite(y) || x < -90 || x > 90 || y < -180 || y > 180)
    throw new Error('A route point has invalid coordinates.'); return [x, y]; })).filter(s => s.length >= 2); if (!segments.length)
    throw new Error('No track or route with at least two points was found.'); if (segments.reduce((n, s) => n + s.length, 0) > 100000)
    throw new Error('This GPX has too many points (maximum 100,000).'); const track = nodes(doc.documentElement, 'trk')[0] || nodes(doc.documentElement, 'rte')[0]; const name = (track ? Array.from(track.children).find(n => n.localName === 'name')?.textContent : null)?.trim() || fallback.replace(/\.gpx$/i, ''); return { name: name.slice(0, 150), segments, distance: distanceOf(segments), durationSeconds: durationOfGPX(containers) }; }

function durationOfGPX(containers) {
 const points=containers.flatMap(s=>Array.from(s.getElementsByTagNameNS('*',s.localName==='rte'?'rtept':'trkpt')));
 if(points.length<2)return null;
 function stamp(pt){const text=Array.from(pt.children).find(n=>n.localName==='time')?.textContent?.trim();if(!text||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(text))return null;const value=Date.parse(text);return Number.isFinite(value)?value:null}
 const first=stamp(points[0]),last=stamp(points[points.length-1]);
 if(first===null||last===null||last<=first)return null;
 let previous=first;for(const pt of points){const t=stamp(pt);if(t===null)continue;if(t<previous)return null;previous=t}
 return (last-first)/1000;
}
export function formatDuration(seconds){
 if(!Number.isFinite(seconds)||seconds<=0)return '';
 if(seconds<60)return '<1 min';
 const minutes=Math.round(seconds/60),hours=Math.floor(minutes/60),remaining=minutes%60;
 return hours?(hours+' h'+(remaining?' '+remaining+' min':'')):minutes+' min';
}
