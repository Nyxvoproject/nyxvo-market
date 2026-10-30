require("dotenv").config();
const express = require("express");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const app = express();
const db = new Database("nyxvo.sqlite");
app.use(express.json({ limit: "30kb" }));
app.use(express.static(path.join(__dirname, "public")));

db.exec(`
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, created_at TEXT NOT NULL, customer TEXT NOT NULL,
 category TEXT NOT NULL, service_id TEXT NOT NULL, target TEXT NOT NULL,
 quantity INTEGER NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT ''
);
`);
const services = [
 {id:"ig-followers",category:"Sosial Media",name:"Instagram Followers",price:12000,unit:"per 100",desc:"Contoh katalog — sambungkan provider resmi sebelum transaksi."},
 {id:"tiktok-likes",category:"Sosial Media",name:"TikTok Likes",price:5000,unit:"per 100",desc:"Contoh katalog — status awal menunggu."},
 {id:"yt-views",category:"Sosial Media",name:"YouTube Views",price:8000,unit:"per 1000",desc:"Gunakan layanan sesuai aturan platform."},
 {id:"wa-number",category:"Nomor Virtual",name:"Nomor virtual / OTP legal",price:15000,unit:"per nomor",desc:"Ketersediaan bergantung provider dan negara. Jangan gunakan untuk penipuan atau menghindari keamanan."},
 {id:"premium-app",category:"Aplikasi Digital",name:"Aplikasi / lisensi digital",price:20000,unit:"per lisensi",desc:"Jual hanya lisensi resmi dan sesuai ketentuan penerbit."}
];
const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
app.get("/api/health", (_,res)=>res.json({ok:true,app:"Nyxvo Project",providerConfigured:!!(process.env.PROVIDER_BASE_URL&&process.env.PROVIDER_API_KEY)}));
app.get("/api/services", (_,res)=>res.json(services.map(s=>({...s,price_label:money(s.price)}))));
app.post("/api/orders", (req,res)=>{
 const {customer,service_id,target,quantity=1}=req.body||{};
 const service=services.find(s=>s.id===service_id);
 if(!customer||String(customer).trim().length<2) return res.status(400).json({error:"Isi nama atau kontak pelanggan."});
 if(!service) return res.status(400).json({error:"Layanan tidak ditemukan."});
 if(!target||String(target).trim().length<2) return res.status(400).json({error:"Isi target/akun atau detail pesanan."});
 const q=Number(quantity);
 if(!Number.isInteger(q)||q<1||q>10000) return res.status(400).json({error:"Jumlah harus 1–10000."});
 const id="NYX-"+crypto.randomBytes(4).toString("hex").toUpperCase();
 const price=service.price*q;
 db.prepare("INSERT INTO orders (id,created_at,customer,category,service_id,target,quantity,price,status,note) VALUES (?,?,?,?,?,?,?,?,?,?)")
 .run(id,new Date().toISOString(),String(customer).trim().slice(0,100),service.category,service.id,String(target).trim().slice(0,500),q,price,"MENUNGGU PEMBAYARAN","Starter mode: belum dikirim ke provider.");
 res.status(201).json({id,price,price_label:money(price),status:"MENUNGGU PEMBAYARAN",message:"Pesanan dicatat. Pembayaran dan pemrosesan otomatis belum aktif sampai gateway/provider resmi dikonfigurasi."});
});
app.get("/api/orders/:id", (req,res)=>{
 const row=db.prepare("SELECT id,created_at,category,service_id,target,quantity,price,status,note FROM orders WHERE id=?").get(req.params.id);
 if(!row) return res.status(404).json({error:"Pesanan tidak ditemukan."});
 res.json({...row,price_label:money(row.price)});
});
app.get("/api/admin/orders", (req,res)=>{
 const key=process.env.ADMIN_KEY;
 if(!key || req.get("x-admin-key")!==key) return res.status(401).json({error:"Admin key tidak valid."});
 res.json(db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 300").all());
});
app.patch("/api/admin/orders/:id", (req,res)=>{
 const key=process.env.ADMIN_KEY;
 if(!key || req.get("x-admin-key")!==key) return res.status(401).json({error:"Admin key tidak valid."});
 const allowed=["MENUNGGU PEMBAYARAN","DIBAYAR","DIPROSES","BERHASIL","GAGAL","DIBATALKAN"];
 const {status,note=""}=req.body||{};
 if(!allowed.includes(status)) return res.status(400).json({error:"Status tidak valid."});
 const result=db.prepare("UPDATE orders SET status=?,note=? WHERE id=?").run(status,String(note).slice(0,500),req.params.id);
 if(!result.changes) return res.status(404).json({error:"Pesanan tidak ditemukan."});
 res.json({ok:true,id:req.params.id,status});
});
const port=Number(process.env.PORT)||3000;
app.listen(port,"0.0.0.0",()=>console.log(`Nyxvo Market running on http://localhost:${port}`));
