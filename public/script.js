const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
let mode="login";

function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function setMode(m){mode=m;$$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.mode===m));$("#authTitle").textContent=m==="login"?"Hesabına giriş yap":"Hesap oluştur";$("#authSub").textContent=m==="login"?"Paneline devam etmek için bilgilerini gir.":"Yeni hesabını oluştur ve kendi paneline geç.";$("#authSubmit").textContent=m==="login"?"Giriş Yap":"Kayıt Ol";$("#password").autocomplete=m==="login"?"current-password":"new-password"}
$$(".tab").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

async function api(action, opts={}){
  const res=await fetch("/.netlify/functions/auth"+(action?("?action="+encodeURIComponent(action)):""),{credentials:"include",...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||"Bir hata oluştu.");
  return data;
}

function showApp(data){
  $("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");
  const u=data.user; const name=u.email.split("@")[0];
  $("#welcome").textContent=`Hoş geldin, ${name} 👋`;$("#userChip").textContent=u.email;
  $("#emailValue").textContent=u.email;$("#idValue").textContent=u.id;$("#accountEmail").textContent=u.email;$("#accountId").textContent=u.id;
  const d=new Date(u.createdAt);const formatted=isNaN(d)? "—":d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"});
  $("#createdValue").textContent=formatted;$("#accountCreated").textContent=formatted;
  $("#accountStatus").textContent="AKTİF";$("#planValue").textContent="Standart";
}
function showAuth(){ $("#appView").classList.add("hidden");$("#authView").classList.remove("hidden"); }
async function loadSession(){
  try{const data=await api("me"); if(data.user) showApp(data); else showAuth();}
  catch{showAuth();}
}
$("#authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#email").value.trim(), password=$("#password").value;
  try{
    await api("",{method:"POST",body:JSON.stringify({action:mode,email,password})});
    $("#authForm").reset(); await loadSession(); toast(mode==="login"?"Giriş başarılı.":"Hesap oluşturuldu.");
  }catch(err){toast(err.message)}
});
async function logout(){try{await api("",{method:"POST",body:JSON.stringify({action:"logout"})});showAuth();toast("Oturum kapatıldı.");}catch(e){toast(e.message)}}
$("#logout").onclick=logout;$("#logout2").onclick=logout;
$("#refreshBtn").onclick=loadSession;
$$("[data-page]").forEach(b=>b.addEventListener("click",()=>{const page=b.dataset.page;$$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));$("#homePage").classList.toggle("hidden",page!=="home");$("#accountPage").classList.toggle("hidden",page!=="account")}));
loadSession();