const $=s=>document.querySelector(s);
let services=[];
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function loadServices(){
 try{
  services=await (await fetch("/api/services")).json();
  $("#serviceSelect").innerHTML='<option value="">Pilih layanan</option>'+services.map(s=>`<option value="${safe(s.id)}">${safe(s.name)} — ${rupiah(s.price)}</option>`).join("");
  renderServices("Semua"); estimate();
 }catch(e){$("#serviceGrid").innerHTML='<div class="loading">Katalog gagal dimuat. Pastikan server aktif.</div>'}
}
function renderServices(filter){
 const items=filter==="Semua"?services:services.filter(s=>s.category===filter);
 $("#serviceGrid").innerHTML=items.map((s,i)=>`<article class="service-card"><div class="card-icon">${["↗","◎","◇"][i%3]}</div><div class="category">${safe(s.category).toUpperCase()}</div><h3>${safe(s.name)}</h3><p>${safe(s.desc)}</p><div class="card-bottom"><div class="price">${rupiah(s.price)}<small>${safe(s.unit)}</small></div><button class="choose" data-id="${safe(s.id)}">PILIH ↗</button></div></article>`).join("")||'<div class="loading">Belum ada layanan di kategori ini.</div>';
 document.querySelectorAll(".choose").forEach(b=>b.addEventListener("click",()=>{$("#serviceSelect").value=b.dataset.id;estimate();location.hash="order"}));
}
function estimate(){const s=services.find(x=>x.id===$("#serviceSelect").value);const q=Math.max(1,Number($('[name="quantity"]').value)||1);$("#estimate").textContent=rupiah(s?s.price*q:0)}
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderServices(b.dataset.filter)}));
$("#serviceSelect").addEventListener("change",estimate);$('[name="quantity"]').addEventListener("input",estimate);
$("#menuBtn").addEventListener("click",()=>$("#nav").classList.toggle("open"));
$("#nav").querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>$("#nav").classList.remove("open")));
$("#orderForm").addEventListener("submit",async e=>{
 e.preventDefault();const box=$("#orderResult");box.className="result show";box.textContent="Membuat pesanan…";
 const body=Object.fromEntries(new FormData(e.currentTarget).entries());body.quantity=Number(body.quantity);
 try{const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||"Gagal membuat pesanan");box.innerHTML=`<strong>Pesanan tercatat: ${safe(d.id)}</strong><br>Total: ${safe(d.price_label)}<br>Status: ${safe(d.status)}<br>${safe(d.message)}<br><span class="fine">Simpan ID ini untuk cek status pesanan.</span>`;e.currentTarget.reset();estimate()}catch(err){box.textContent=err.message}
});
$("#checkForm").addEventListener("submit",async e=>{
 e.preventDefault();const box=$("#checkResult");box.className="result show";box.textContent="Memeriksa pesanan…";
 try{const id=new FormData(e.currentTarget).get("id").trim();const r=await fetch("/api/orders/"+encodeURIComponent(id));const d=await r.json();if(!r.ok)throw Error(d.error||"Gagal memeriksa");box.innerHTML=`<strong>${safe(d.id)}</strong><br>Status: ${safe(d.status)}<br>Kategori: ${safe(d.category)}<br>Total: ${safe(d.price_label)}<br>Waktu: ${safe(new Date(d.created_at).toLocaleString("id-ID"))}<br>Catatan: ${safe(d.note)}`}catch(err){box.textContent=err.message}
});
loadServices();
