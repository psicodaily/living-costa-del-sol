import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ locale:"es-ES", viewport:{width:1366,height:900}, acceptDownloads:false, userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" });
const p = await ctx.newPage();
const BASE="tools/gmaps/puerto-banus";
async function consent(){ for(const t of ["Aceptar todo","Rechazar todo","Accept all","Reject all"]){ try{const el=p.getByRole("button",{name:t});if(await el.count()){await el.first().click({timeout:1500});return;}}catch{} } }
function coords(u){ const m=u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); return m?[m[1],m[2]]:null; }
async function landmark(slug,query){
  const dir=`${BASE}/locales/${slug}`;
  try{
    await p.goto("https://www.google.com/maps/search/"+encodeURIComponent(query)+"?hl=es",{waitUntil:"domcontentloaded",timeout:45000});
    await p.waitForTimeout(2500); await consent(); await p.waitForTimeout(3000);
    await p.screenshot({path:`${dir}/ficha.png`}); // ficha (con fotos del local)
    const c=coords(p.url());
    if(c){ await p.goto(`https://www.google.com/maps/@${c[0]},${c[1]},90m/data=!3m1!1e3?hl=es`,{waitUntil:"domcontentloaded",timeout:45000}); await p.waitForTimeout(2500); await consent(); await p.waitForTimeout(4500); await p.screenshot({path:`${dir}/sat.png`}); }
    console.log("OK",slug, c?("@"+c.join(",")):"(sin coords)");
  }catch(e){ console.log("FAIL",slug,e.message.slice(0,40)); }
}
async function V(lat,lon,h,n){ try{ await p.goto(`https://www.google.com/maps?q&layer=c&cbll=${lat},${lon}&cbp=11,${h},0,0,0&hl=es`,{waitUntil:"domcontentloaded",timeout:45000}); await p.waitForTimeout(2200); await consent(); await p.waitForTimeout(7000); await p.screenshot({path:`${BASE}/calles/calle-${n}.png`}); console.log("OK calle",n);}catch(e){console.log("FAIL calle",n);} }
// LOCALES icónicos (satélite + ficha)
await landmark("corte-ingles","El Corte Inglés Puerto Banús");
await landmark("mcdonalds","McDonald's Puerto Banús");
await landmark("benabola","Hotel Benabola Puerto Banús");
await landmark("tom-ford","Tom Ford Puerto Banús");
await landmark("rolex","Rolex Puerto Banús");
await landmark("pizzeria","Pizzeria Picasso Puerto Banús");
await landmark("club-entrada","Tibu Banús discoteca Puerto Banús");
// BARRIDO COMPLETO de calles (rejilla densa por Puerto Banús)
const pts=[[36.4852,-4.9512,170,13],[36.4848,-4.9500,80,14],[36.4860,-4.9505,200,15],[36.4872,-4.9512,160,16],[36.4880,-4.9505,120,17],[36.4888,-4.9520,200,18],[36.4884,-4.9540,160,19],[36.4876,-4.9558,120,20],[36.4866,-4.9495,100,21],[36.4842,-4.9525,40,22],[36.4858,-4.9580,300,23],[36.4870,-4.9530,250,24]];
for(const [la,lo,h,n] of pts) await V(la,lo,h,n);
await b.close(); console.log("fin");
