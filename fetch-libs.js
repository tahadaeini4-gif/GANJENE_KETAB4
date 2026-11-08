// دانلود کتابخانه‌های ظاهر سایت (بوت‌استرپ، آیکن، فونت، xlsx) — همه کنار همین فایل (بدون پوشه)
const https=require("https"),fs=require("fs"),path=require("path");
const V=__dirname;
const get=(u,hop=0)=>new Promise((ok,no)=>{
  const req=https.get(u,{headers:{"User-Agent":"Mozilla/5.0"},timeout:20000},r=>{
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location&&hop<5)return ok(get(new URL(r.headers.location,u).href,hop+1));
    if(r.statusCode!==200)return no(new Error(r.statusCode+" "+u));
    const b=[];r.on("data",c=>b.push(c));r.on("end",()=>ok(Buffer.concat(b)));
  });
  req.on("error",no);req.on("timeout",()=>{req.destroy();no(new Error("timeout "+u))});
});
const J="https://cdn.jsdelivr.net/npm/";
const need=f=>!fs.existsSync(path.join(V,f))||fs.statSync(path.join(V,f)).size<200;
async function step(name,fn){try{await fn();console.log("✔",name)}catch(e){console.log("✘",name,"-",e.message)}}

async function fetchLibs(){
  const w=(f,d)=>fs.writeFileSync(path.join(V,f),d);
  if(need("bootstrap.rtl.min.css"))await step("bootstrap css",async()=>w("bootstrap.rtl.min.css",await get(J+"bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css")));
  if(need("bootstrap.bundle.min.js"))await step("bootstrap js",async()=>w("bootstrap.bundle.min.js",await get(J+"bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js")));
  if(need("xlsx.full.min.js"))await step("xlsx",async()=>w("xlsx.full.min.js",await get("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")));
  if(need("bootstrap-icons.min.css")||need("bootstrap-icons.woff2")||need("bootstrap-icons.woff"))await step("icons",async()=>{
    for(const e of["woff2","woff"])w("bootstrap-icons."+e,await get(J+"bootstrap-icons@1.11.3/font/fonts/bootstrap-icons."+e));
    let css=(await get(J+"bootstrap-icons@1.11.3/font/bootstrap-icons.min.css")).toString().replace(/\?[0-9a-f]{20,}/g,"").replace(/url\("?\.?\/?fonts\//g,'url("').replace(/url\("([^")]+)"?\)/g,'url("$1")');
    w("bootstrap-icons.min.css",css);
  });
  if(need("vazirmatn.css")||need("vazirmatn-400.woff2"))await step("font",async()=>{
    let css="";
    for(const wt of[400,500,600,700,800,900]){
      w(`vazirmatn-${wt}.woff2`,await get(J+`@fontsource/vazirmatn/files/vazirmatn-arabic-${wt}-normal.woff2`));
      css+=`@font-face{font-family:"Vazirmatn";font-weight:${wt};font-display:swap;src:url("./vazirmatn-${wt}.woff2") format("woff2")}\n`;
    }
    w("vazirmatn.css",css);
  });
}
module.exports={fetchLibs};
if(require.main===module)fetchLibs().then(()=>console.log("پایان"));
