import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
const store=getStore("best-panel");
const json=(b,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
const token=req=>(req.headers.get("cookie")||"").match(/(?:^|;\s*)bp_session=([^;]+)/)?.[1];
async function current(req){const t=token(req);if(!t)return null;const s=await store.get(`session:${t}`,"json");if(!s||s.expiresAt<Date.now())return null;return await store.get(`user:${s.userId}`,"json")}
function admin(u){return u && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && u.email===process.env.ADMIN_EMAIL}
export default async req=>{
  const u=await current(req); if(!admin(u))return json({error:"Admin yetkisi gerekli."},403);
  if(req.method==="GET"){
    const users=[]; for await(const item of store.list({prefix:"user:"})){const x=await store.get(item.key,"json"); if(x) users.push({id:x.id,email:x.email,createdAt:x.createdAt});}
    return json({users});
  }
  const b=await req.json().catch(()=>({}));
  if(b.action==="create-code"){
    const code=(b.code||crypto.randomBytes(6).toString("hex")).toUpperCase();
    const days=Math.max(1,Math.min(3650,Number(b.days||30)));
    const plan=String(b.plan||"Premium").slice(0,40);
    const exists=await store.get(`code:${code}`,"json"); if(exists)return json({error:"Kod zaten var."},409);
    await store.setJSON(`code:${code}`,{code,days,plan,used:false,createdAt:new Date().toISOString()});
    return json({ok:true,code,days,plan});
  }
  if(b.action==="list-codes"){
    const codes=[]; for await(const item of store.list({prefix:"code:"})){const x=await store.get(item.key,"json");if(x)codes.push(x)}
    return json({codes});
  }
  return json({error:"Geçersiz işlem."},400);
}
