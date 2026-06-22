import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const d = JSON.parse(readFileSync("public/marbella.json","utf8"));
// GEOREF (de tools/lib/geo.mjs)
const R=6371000, lat0=36.5154, lon0=-4.8858, DEG=Math.PI/180, r0=1200, k=0.5;
const mLat=R*DEG, mLon=R*DEG*Math.cos(lat0*DEG);
// inversa de compact(): world(warp) -> metros reales (ox,oz) respecto al centro georef
function unwarp(x,z){ const r=Math.hypot(x,z); if(r>r0&&r!==0){ const ro=r0+(r-r0)/k; const s=ro/r; return [x*s, z*s]; } return [x,z]; }
const toLonLat=(x,z)=>{ const [ox,oz]=unwarp(x,z); return [lon0+ox/mLon, lat0-oz/mLat]; };
// zona Puerto Banús
const pz=(d.zones||[]).find(z=>z.name==="Puerto Banús");
const pip=(x,z,r)=>{let i2=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,zi]=r[i],[xj,zj]=r[j];if((zi>z)!==(zj>z)&&x<((xj-xi)*(z-zi))/(zj-zi)+xi)i2=!i2;}return i2;};
const cen=fp=>{let x=0,z=0;for(const[a,b]of fp){x+=a;z+=b;}return[x/fp.length,z/fp.length];};
const pb=(d.buildings||[]).filter(b=>{ if(!b.footprint||b.footprint.length<3)return false; const[cx,cz]=cen(b.footprint); return pip(cx,cz,pz.polygon); });
// origen local = centroide de la marina PB (en metros reales)
const marina=(d.areas||[]).find(a=>a.kind==="marina"&&a.barrio==="Puerto Banús")||(d.areas||[]).find(a=>a.kind==="marina");
const [mcx,mcz]=cen(marina.polygon); const [omx,omz]=unwarp(mcx,mcz); // metros reales del centro marina
const toLocal=(x,z)=>{ const[ox,oz]=unwarp(x,z); return [Math.round((ox-omx)*100)/100, Math.round((oz-omz)*100)/100]; };
// verificación: ¿el centro de la marina cae cerca de lon -4.953, lat 36.487?
console.log("marina centro lon/lat:", toLonLat(mcx,mcz).map(n=>n.toFixed(4)), "(esperado ~ -4.953, 36.487)");
console.log("edificios Puerto Banús:", pb.length);
// salida blockout en metros locales
const out={ origin:{lon:toLonLat(mcx,mcz)[0], lat:toLonLat(mcx,mcz)[1]},
  buildings: pb.map(b=>({ footprint: b.footprint.map(([x,z])=>toLocal(x,z)), height: Math.max(6, Math.round(b.height||9)) })),
  marina: marina.polygon.map(([x,z])=>toLocal(x,z)) };
mkdirSync("ue5",{recursive:true});
writeFileSync("ue5/puertobanus_blockout.json", JSON.stringify(out));
// tamaño aprox del distrito
let mnx=1e9,mxx=-1e9,mnz=1e9,mxz=-1e9; for(const b of out.buildings)for(const[x,z]of b.footprint){mnx=Math.min(mnx,x);mxx=Math.max(mxx,x);mnz=Math.min(mnz,z);mxz=Math.max(mxz,z);}
console.log("tamaño distrito (m):", Math.round(mxx-mnx),"x",Math.round(mxz-mnz));
console.log("archivo:", "ue5/puertobanus_blockout.json", (JSON.stringify(out).length/1024).toFixed(0)+" KB");
