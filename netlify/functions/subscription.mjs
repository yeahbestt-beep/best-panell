import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
const store=getStore("best-panel");
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
const token=req=>(req.headers.get("cookie")||"").match(/(?:^|;\s*)bp_session=([^;]+)/)?.[1];
async function user(req){const t=token(req);if(!t)return null;const ses=await store.get(`session:${t}`,"json");if(!ses||ses.expiresAt<Date.now())return null;return await store.get(`user:${ses.userId}`,"json")}
export default async req=>{
  const u=await user(req); if(!u)return json({error:"Giriş gerekli."},401);
  if(req.method==="GET") return json({subscriptions:await store.get(`subs:${u.id}`,"json")||[]});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const b=await req.json().catch(()=>({}));
  if(b.action!=="activate")return json({error:"Geçersiz işlem."},400);
  const code=String(b.code||"").trim().toUpperCase();
  if(!code)return json({error:"Aktivasyon kodu gerekli."},400);
  const key=`code:${code}`, data=await store.get(key,"json");
  if(!data)return json({error:"Kod bulunamadı."},404);
  if(data.used)return json({error:"Bu kod daha önce kullanılmış."},409);
  const now=Date.now(), days=Number(data.days||30);
  const subs=await store.get(`subs:${u.id}`,"json")||[];
  const sub={id:crypto.randomUUID(),plan:data.plan||"Premium",active:true,activatedAt:new Date(now).toISOString(),expiresAt:new Date(now+days*86400000).toISOString()};
  subs.push(sub); data.used=true; data.usedBy=u.id; data.usedAt=new Date(now).toISOString();
  await store.setJSON(key,data); await store.setJSON(`subs:${u.id}`,subs);
  return json({ok:true,subscription:sub});
}
