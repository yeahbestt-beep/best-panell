import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const store = getStore("best-panel");
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body), {status, headers:{"content-type":"application/json; charset=utf-8",...headers}});
const id = () => crypto.randomUUID();
const hash = (password,salt=crypto.randomBytes(16).toString("hex")) => {
  const key=crypto.pbkdf2Sync(password,salt,120000,32,"sha256").toString("hex");
  return {salt,key};
};
const cookie = (token,maxAge=604800) => `bp_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function body(req){try{return await req.json()}catch{return {}}}
function sessionToken(req){return (req.headers.get("cookie")||"").match(/(?:^|;\s*)bp_session=([^;]+)/)?.[1]}

export default async (req)=>{
  if(req.method==="GET"){
    const token=sessionToken(req);
    if(!token) return json({user:null,subscriptions:[]});
    const session=await store.get(`session:${token}`,"json");
    if(!session || session.expiresAt<Date.now()) return json({user:null,subscriptions:[]});
    const user=await store.get(`user:${session.userId}`,"json");
    if(!user) return json({user:null,subscriptions:[]});
    const subs=await store.get(`subs:${user.id}`,"json") || [];
    return json({user:{id:user.id,email:user.email,createdAt:user.createdAt},subscriptions:subs});
  }
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  const b=await body(req);
  if(!b.email || !b.password) return json({error:"E-posta ve şifre gerekli."},400);
  const email=String(b.email).trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Geçerli bir e-posta gir."},400);
  if(String(b.password).length<8) return json({error:"Şifre en az 8 karakter olmalı."},400);

  if(b.action==="register"){
    const existing=await store.get(`email:${encodeURIComponent(email)}`,"json");
    if(existing) return json({error:"Bu e-posta zaten kayıtlı."},409);
    const user={id:id(),email,createdAt:new Date().toISOString(),password:hash(b.password)};
    await store.setJSON(`user:${user.id}`,user);
    await store.setJSON(`email:${encodeURIComponent(email)}`,{userId:user.id});
    await store.setJSON(`subs:${user.id}`,[]);
    const token=crypto.randomBytes(32).toString("hex");
    await store.setJSON(`session:${token}`,{userId:user.id,expiresAt:Date.now()+604800000});
    return json({ok:true},200,{"set-cookie":cookie(token)}); 
  }
  if(b.action==="login"){
    const idx=await store.get(`email:${encodeURIComponent(email)}`,"json");
    if(!idx) return json({error:"E-posta veya şifre hatalı."},401);
    const user=await store.get(`user:${idx.userId}`,"json");
    if(!user) return json({error:"Hesap bulunamadı."},401);
    const check=hash(b.password,user.password.salt);
    if(!crypto.timingSafeEqual(Buffer.from(check.key,"hex"),Buffer.from(user.password.key,"hex"))) return json({error:"E-posta veya şifre hatalı."},401);
    const token=crypto.randomBytes(32).toString("hex");
    await store.setJSON(`session:${token}`,{userId:user.id,expiresAt:Date.now()+604800000});
    return json({ok:true},200,{"set-cookie":cookie(token)});
  }
  if(b.action==="logout"){
    const token=sessionToken(req); if(token) await store.delete(`session:${token}`);
    return json({ok:true},200,{"set-cookie":cookie("",0)});
  }
  return json({error:"Geçersiz işlem."},400);
}
