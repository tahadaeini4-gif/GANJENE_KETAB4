// سرور گنجینه ی کتاب — بدون نیاز به هیچ پکیج اضافه (فقط Node.js)
const http=require("http"),fs=require("fs"),path=require("path");
const PORT=process.env.PORT||3000;
const DATA_DIR=process.env.DATA_DIR||path.join(__dirname,"data");
const FILE=path.join(DATA_DIR,"state.json");
const PUB=__dirname;
fs.mkdirSync(DATA_DIR,{recursive:true});
// اگر کتابخانه‌های ظاهر سایت نیست، (در صورت دسترسی به اینترنت) خودکار دانلود می‌شود
try{require("./fetch-libs").fetchLibs().catch(()=>{})}catch{}

let state={},version=0;
try{const d=JSON.parse(fs.readFileSync(FILE,"utf8"));state=d.state||{};version=d.version||0}catch{}

let writing=false,again=false;
function persist(){
  if(writing){again=true;return}
  writing=true;
  const tmp=FILE+".tmp";
  fs.writeFile(tmp,JSON.stringify({version,state}),err=>{
    if(!err)fs.renameSync(tmp,FILE);else console.error(err);
    writing=false;if(again){again=false;persist()}
  });
}
// بک‌آپ روزانه
setInterval(()=>{try{fs.copyFileSync(FILE,path.join(DATA_DIR,"backup-"+new Date().toISOString().slice(0,10)+".json"))}catch{}},6*3600*1000);

const KEYED={cats:"id",students:"code",books:"ip",res:"id",directRecs:"id",scoreHistory:"id",recs:"id"};

function applyPatch(p){
  for(const[k,v]of Object.entries(p.set||{}))state[k]=v;
  for(const[col,key]of Object.entries(KEYED)){
    const c=p.cols&&p.cols[col];if(!c)continue;
    if(!Array.isArray(state[col]))state[col]=[];
    const arr=state[col];
    const rem=new Set((c.remove||[]).map(String));
    let out=rem.size?arr.filter(x=>!rem.has(String(x[key]))):arr;
    const idx=new Map(out.map((x,i)=>[String(x[key]),i]));
    for(const[id,ch]of Object.entries(c.change||{})){
      const i=idx.get(String(id));if(i===undefined)continue;
      const it=out[i];
      Object.assign(it,ch.fields||{});
      if(ch.ptsDelta)it.pts=Number(it.pts||0)+Number(ch.ptsDelta);
    }
    for(const it of c.add||[]){
      if(idx.has(String(it[key])))continue; // تکراری نشود
      idx.set(String(it[key]),out.length);out.push(it);
    }
    state[col]=out;
  }
  if(p.over){
    if(!state.over||typeof state.over!=="object")state.over={};
    for(const[k,v]of Object.entries(p.over.set||{}))state.over[k]=v;
    for(const k of p.over.remove||[])delete state.over[k];
  }
  version++;persist();
}

const MIME={".html":"text/html;charset=utf-8",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".woff":"font/woff",".ttf":"font/ttf",".svg":"image/svg+xml",".png":"image/png",".json":"application/json",".ico":"image/x-icon"};
function body(req){return new Promise((ok,no)=>{let b=[],n=0;req.on("data",c=>{n+=c.length;if(n>80e6){no(new Error("big"));req.destroy()}else b.push(c)});req.on("end",()=>ok(Buffer.concat(b).toString()));req.on("error",no)})}
function json(res,code,obj){const s=JSON.stringify(obj);res.writeHead(code,{"Content-Type":"application/json;charset=utf-8","Cache-Control":"no-store"});res.end(s)}

http.createServer(async(req,res)=>{
  let url;try{url=new URL(req.url,"http://x")}catch{res.writeHead(400);return res.end("bad")}
  try{
    if(url.pathname==="/api/version")return json(res,200,{version});
    if(url.pathname==="/api/state"&&req.method==="GET")return json(res,200,{ok:true,version,state});
    if(url.pathname==="/api/patch"&&req.method==="POST"){
      applyPatch(JSON.parse(await body(req)));
      return json(res,200,{ok:true,version,state});
    }
    if(url.pathname==="/api/import"&&req.method==="POST"){ // وارد کردن کل داده قدیمی (فقط وقتی سرور خالی است)
      if(Object.keys(state).length&&url.searchParams.get("force")!=="1")return json(res,409,{ok:false,error:"server not empty"});
      const d=JSON.parse(await body(req));state=d.state||d;version++;persist();
      return json(res,200,{ok:true,version});
    }
    let p=decodeURIComponent(url.pathname);if(p==="/")p="/index.html";
    p=p.replace(/^\/vendor\//,"/").replace(/^\/fonts\//,"/");   // سازگاری با مسیرهای قدیمی
    const name=path.basename(p);
    const PRIVATE=["server.js","fetch-libs.js","package.json","package-lock.json"];
    const f=path.normalize(path.join(PUB,name));
    const ext=path.extname(name).toLowerCase();
    if(p!=="/"+name||PRIVATE.includes(name)||!MIME[ext]||ext===".json"||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end("Not found")}
    res.writeHead(200,{"Content-Type":MIME[ext],"Cache-Control":name==="index.html"?"no-cache":"public,max-age=604800"});
    fs.createReadStream(f).pipe(res);
  }catch(e){console.error(e);json(res,500,{ok:false,error:String(e.message)})}
}).listen(PORT,"0.0.0.0",()=>console.log("Ganjine running on http://0.0.0.0:"+PORT));
