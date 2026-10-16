const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PORT=Number(process.env.PORT||8080),PASSWORD=process.env.GAME_PASSWORD||'Tulle';
const slots=new Map(),voiceQueues=new Map(),chat=[];let seq=0;
// Auktoritativ klocka, platser och pausad fas. All tid i Unix-millisekunder.
const attractions={coaster:{running:false,start:0,phase:0,speed:.000022,seats:4},ferris:{running:false,start:0,phase:0,speed:.000095,seats:10}};
const rideSeats=new Map(); // session-id -> {type,seat}
function ridePhase(a,now=Date.now()){return a.phase+(a.running?(now-a.start)*a.speed:0)}
function rideStatus(){const now=Date.now();return {serverTime:now,attractions:Object.fromEntries(Object.entries(attractions).map(([key,a])=>[key,{running:a.running,phase:ridePhase(a,now),seats:a.seats,occupants:[...rideSeats].filter(([,r])=>r.type===key).map(([id,r])=>({slot:slots.get(id)?.slot,seat:r.seat})).filter(o=>o.slot)}]))}}
function leaveRide(id){const r=rideSeats.get(id);if(!r)return;rideSeats.delete(id);const a=attractions[r.type];if(![...rideSeats.values()].some(v=>v.type===r.type)){a.phase=ridePhase(a);a.running=false;a.start=0}}

function reply(res,obj,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>1000000)throw Error('För stort meddelande')}return s?JSON.parse(s):{}}
function clean(){for(const [id,p] of slots)if(Date.now()-p.seen>120000){leaveRide(id);slots.delete(id);voiceQueues.delete(id)}}
function roster(){clean();return [...slots.values()].sort((a,b)=>a.slot-b.slot).map(p=>({id:p.id,slot:p.slot,name:p.name,state:p.state?{...p.state,player:{...p.state.player,ride:rideSeats.get(p.id)||null}}:null}))}
function safeState(v){if(!v||typeof v!=='object')return null;const p=v.player||{},w=v.world||{};return {appearance:(v.appearance&&typeof v.appearance==='object')?Object.fromEntries(Object.entries(v.appearance).filter(([k,val])=>typeof val==='string'&&val.length<50)): {},player:{moving:!!p.moving,activity:['coaster','ride','obstacle','dance','walk'].includes(p.activity)?p.activity:'walk',dance:clamp(p.dance,-1,20),ride:null,x:clamp(p.x,-220,220),z:clamp(p.z,-220,220),y:clamp(p.y,0,21),yaw:clamp(p.yaw,-10000,10000)},world:{parts:Array.isArray(w.parts)?w.parts.slice(0,1500).filter(d=>d&&['square','half','small','triangle','roof'].includes(d.shape)&&Number.isFinite(d.x)&&Number.isFinite(d.z)&&Number.isFinite(d.y)&&Math.abs(d.x)<=25&&Math.abs(d.z)<=25&&d.y>=0&&d.y<=20&&/^#[0-9a-f]{6}$/i.test(d.color)):[],animals:Array.isArray(w.animals)?w.animals.slice(0,60).filter(a=>a&&['horse','foal','sheep','cat','dog'].includes(a.type)&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.abs(a.x)<=25&&Math.abs(a.z)<=25):[]}}}
function clamp(v,a,b){return Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):0}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');clean();
 if(u.pathname==='/api/status')return reply(res,{max:4,players:roster(),...rideStatus()});
 if(u.pathname==='/api/join'&&req.method==='POST'){const b=await body(req),slot=Number(b.slot),name=String(b.name||'Spelare').trim().slice(0,18),id=String(b.id||'').slice(0,80);if(String(b.password||'')!==PASSWORD)return reply(res,{error:'wrong password'},403);if(!Number.isInteger(slot)||slot<1||slot>4||!id)return reply(res,{error:'invalid slot'},400);const existing=slots.get(id);if(existing&&existing.slot!==slot)return reply(res,{error:'slot mismatch'},409);if(!existing&&[...slots.values()].some(p=>p.slot===slot))return reply(res,{error:'slot busy'},409);const p=existing||{id,slot,state:null};p.name=name||'Spelare';p.seen=Date.now();slots.set(id,p);return reply(res,{ok:true,slot,players:roster()})}
 if(u.pathname==='/api/update'&&req.method==='POST'){const b=await body(req),p=slots.get(String(b.id||''));if(!p)return reply(res,{error:'not joined'},403);p.seen=Date.now();p.state=safeState(b.state)||safeState({});p.state.player.ride=rideSeats.get(p.id)||null;return reply(res,{ok:true,slot:p.slot,players:roster(),...rideStatus()})}
 if(u.pathname==='/api/ride'&&req.method==='POST'){
  const b=await body(req),id=String(b.id||''),p=slots.get(id);if(!p)return reply(res,{error:'not joined'},403);
  const type=String(b.type||''),action=String(b.action||'');if(!attractions[type])return reply(res,{error:'invalid ride'},400);
  if(action==='leave'){if(rideSeats.get(id)?.type===type)leaveRide(id);return reply(res,{ok:true,ride:null,...rideStatus()})}
  if(action!=='join')return reply(res,{error:'invalid action'},400);
  const previous=rideSeats.get(id);if(previous&&previous.type!==type)leaveRide(id);
  const a=attractions[type];let seat=previous?.type===type?previous.seat:-1;
  if(seat<0){const used=new Set([...rideSeats.values()].filter(r=>r.type===type).map(r=>r.seat));seat=Array.from({length:a.seats},(_,i)=>i).find(i=>!used.has(i))??-1}
  if(seat<0)return reply(res,{error:'ride full',...rideStatus()},409);
  rideSeats.set(id,{type,seat});if(!a.running){a.start=Date.now();a.running=true}
  return reply(res,{ok:true,ride:{type,seat},...rideStatus()});
 }
 if(u.pathname==='/api/chat/send'&&req.method==='POST'){const b=await body(req),p=slots.get(String(b.id||''));if(!p)return reply(res,{error:'not joined'},403);const message=String(b.message||'').trim().slice(0,300);if(!message)return reply(res,{error:'empty'},400);p.seen=Date.now();chat.push({seq:++seq,name:p.name,from:p.id,message,time:Date.now()});if(chat.length>120)chat.shift();return reply(res,{ok:true,seq})}
 if(u.pathname==='/api/chat/poll'&&req.method==='POST'){const b=await body(req),p=slots.get(String(b.id||''));if(!p)return reply(res,{error:'not joined'},403);p.seen=Date.now();return reply(res,{ok:true,seq,messages:chat.filter(m=>m.seq>Number(b.after||0))})}
 if(u.pathname==='/api/voice/send'&&req.method==='POST'){const b=await body(req),from=String(b.id||''),to=String(b.to||'');if(!slots.has(from)||!slots.has(to))return reply(res,{error:'not joined'},403);if(!b.data||!['offer','answer','candidate','bye','ping'].includes(b.data.type)||JSON.stringify(b.data).length>20000)return reply(res,{error:'bad signal'},400);const q=voiceQueues.get(to)||[];q.push({from,data:b.data});voiceQueues.set(to,q.slice(-100));return reply(res,{ok:true})}
 if(u.pathname==='/api/voice/poll'&&req.method==='POST'){const b=await body(req),id=String(b.id||'');if(!slots.has(id))return reply(res,{error:'not joined'},403);const messages=voiceQueues.get(id)||[];voiceQueues.set(id,[]);return reply(res,{ok:true,messages})}
 if(u.pathname==='/api/leave'&&req.method==='POST'){const b=await body(req);leaveRide(String(b.id||''));slots.delete(String(b.id||''));voiceQueues.delete(String(b.id||''));return reply(res,{ok:true})}
 if(req.method!=='GET')return reply(res,{error:'not found'},404);
 const rel=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname).replace(/^\/+/,''),file=path.resolve(__dirname,rel);if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return reply(res,{error:'not found'},404);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
 }catch(e){console.error(e);reply(res,{error:'server error'},500)}});
server.listen(PORT,'0.0.0.0',()=>console.log('Plattan Online kör på port '+PORT));
