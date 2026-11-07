import { useEffect, useMemo, useState } from "react";
import { CarFront, Sparkles, Activity, Wallet, Clock3, Search, BadgeCheck } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const LABELS = {
  brand:"Marka", vehicle_model:"Araç Modeli / Donanım", year:"Model Yılı",
  km:"Kilometre", fuel:"Yakıt Türü", body:"Kasa Tipi",
  transmission:"Vites Türü", engine:"Motor Hacmi (cc)", city:"İl",
  district:"İlçe", color:"Renk", seller:"Satıcı Türü", damage:"Hasar Durumu"
};
const ORDER = ["brand","vehicle_model","year","km","fuel","body","transmission","engine","city","district","color","seller","damage"];
const money = value => new Intl.NumberFormat("tr-TR", {
  style:"currency", currency:"TRY", maximumFractionDigits:0
}).format(value);

export default function App() {
  const [options,setOptions] = useState({});
  const [form,setForm] = useState({});
  const [status,setStatus] = useState("Bağlantı kontrol ediliyor");
  const [metrics,setMetrics] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [result,setResult] = useState(null);
  const [history,setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("otodeger-gecmis") || "[]"); }
    catch { return []; }
  });
  const [search,setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/options`).then(r => { if(!r.ok) throw new Error(); return r.json(); }),
      fetch(`${API_URL}/api/health`).then(r => { if(!r.ok) throw new Error(); return r.json(); })
    ]).then(([optionData,health]) => {
      const opts = optionData.secenekler || {};
      setOptions(opts);
      setMetrics(health.metrikler || null);
      setStatus("Sistem aktif");
      const initial = {};
      for (const key of ORDER) {
        const vals = opts[key] || [];
        initial[key] = key === "year" ? "2020" : key === "km" ? "60000" : (vals.length ? String(vals[0]) : "");
      }
      // Kullanılabilir kategoriler arasından yaygın varsayılanlar seç.
      for (const [key,preferred] of Object.entries({
        fuel:"Benzin", body:"Sedan", transmission:"Otomatik",
        seller:"Sahibinden", damage:"Yok", color:"Beyaz"
      })) if ((opts[key] || []).map(String).includes(preferred)) initial[key] = preferred;
      setForm(initial);
    }).catch(() => setStatus("API bağlantısı kurulamadı"));
  }, []);

  const update = (key,value) => setForm(current => ({...current,[key]:value}));
  const runEstimate = async event => {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const payload = {...form, year:Number(form.year), km:Number(form.km)};
      const response = await fetch(`${API_URL}/api/predict`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Tahmin isteği başarısız oldu.");
      setResult(data);
      const item = {
        id:Date.now(), vehicle:`${form.year} ${form.brand} ${form.vehicle_model}`,
        detail:`${Number(form.km).toLocaleString("tr-TR")} km · ${form.city} · ${form.fuel} · ${form.transmission}`,
        price:data.tahmini_fiyat_tl, date:new Date().toLocaleString("tr-TR")
      };
      const next = [item,...history].slice(0,10);
      setHistory(next); localStorage.setItem("otodeger-gecmis",JSON.stringify(next));
    } catch(err) {
      setError(err.message || "Sunucuya ulaşılamadı. Lütfen daha sonra tekrar deneyin.");
    } finally { setLoading(false); }
  };

  const filteredHistory = useMemo(() => history.filter(x =>
    `${x.vehicle} ${x.detail}`.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"))
  ),[history,search]);

  return <div className="page">
    <header className="top">
      <a className="logo" href="#"><span className="logo-icon"><CarFront/></span><span>OtoDeğer<small>İKİNCİ EL ARAÇ DEĞERLEME</small></span></a>
      <span className={`status ${status === "Sistem aktif" ? "ok" : ""}`}><i/>{status}</span>
    </header>
    <main>
      <section className="intro">
        <div><div className="eyebrow"><Sparkles size={15}/> TÜRKİYE İKİNCİ EL ARAÇ PAZARI</div>
          <h1>Aracınızın değerini <em>öğrenin.</em></h1>
          <p>Aracınızın özelliklerini girin, makine öğrenmesi modelimizin tahmini ilan fiyatını görün.</p>
        </div>
      </section>

      <section className="stats">
        <div className="stat"><Activity/><span>Model</span><strong>Random Forest</strong></div>
        <div className="stat"><Wallet/><span>Ortalama Mutlak Hata</span><strong>{metrics?.mae ? money(metrics.mae) : "—"}</strong></div>
        <div className="stat"><BadgeCheck/><span>R² Skoru</span><strong>{metrics?.r2 != null ? metrics.r2.toFixed(3).replace(".",",") : "—"}</strong></div>
      </section>

      <div className="layout">
        <section className="card">
          <div className="card-title"><div><span className="eyebrow">ARAÇ BİLGİLERİ</span><h2>Aracınızı tanımlayın</h2><p>Modelin eğitiminde kullanılan araç özelliklerini doldurun.</p></div><CarFront size={27}/></div>
          {Object.keys(options).length === 0 ? <p className="hint">Araç seçenekleri yükleniyor. API bağlantısını kontrol edin.</p> :
          <form onSubmit={runEstimate}>
            <div className="fields">
              {ORDER.map(key => {
                const values = options[key] || [];
                const isNumber = key === "year" || key === "km";
                return <label className="field" key={key}><span>{LABELS[key]}</span>
                  {isNumber ? <input required type="number" min={key==="year" ? 1950 : 0} max={key==="year" ? 2035 : 2000000}
                    value={form[key] ?? ""} onChange={e=>update(key,e.target.value)}/> :
                    <select required value={form[key] ?? ""} onChange={e=>update(key,e.target.value)}>
                      {values.map(value=><option key={String(value)} value={String(value)}>{String(value)}</option>)}
                    </select>}
                </label>;
              })}
            </div>
            <button className="submit" disabled={loading}>{loading ? "Tahmin hesaplanıyor..." : <><Sparkles size={17}/> Araç fiyatını tahmin et</>}</button>
            {error && <div className="error" role="alert">{error}</div>}
          </form>}
        </section>

        <section className="card result">
          <span className="eyebrow">TAHMİN SONUCU</span><h2>Olası ilan değeri</h2>
          {result ? <>
            <div className="price">{money(result.tahmini_fiyat_tl)}</div>
            <div className="range"><span>Yaklaşık aralık</span><strong>{money(result.alt_deger_tl)} – {money(result.ust_deger_tl)}</strong></div>
            <p className="notice">{result.veri_notu}</p>
          </> : <div className="empty"><CarFront size={58}/><strong>Henüz tahmin yapılmadı</strong><span>Soldaki araç bilgilerini doldurarak başlayın.</span></div>}
          <div className="model-note">Tahminler Random Forest modeli tarafından üretilir.</div>
        </section>
      </div>

      <section className="card history">
        <div className="history-head"><div><span className="eyebrow">KAYITLARINIZ</span><h2>Son tahminler</h2></div>
          <label className="search"><Search size={16}/><input placeholder="Araçlarda ara..." value={search} onChange={e=>setSearch(e.target.value)}/></label>
        </div>
        {filteredHistory.length ? <div className="table-scroll"><table><thead><tr><th>ARAÇ</th><th>ÖZELLİKLER</th><th>TAHMİNİ İLAN FİYATI</th><th>TARİH</th></tr></thead>
          <tbody>{filteredHistory.map(item=><tr key={item.id}><td>{item.vehicle}</td><td>{item.detail}</td><td className="price-cell">{money(item.price)}</td><td>{item.date}</td></tr>)}</tbody></table></div> :
          <p className="hint">Henüz kayıtlı tahmin bulunmuyor.</p>}
      </section>
      <footer>© {new Date().getFullYear()} OtoDeğer · Bilgilendirme amaçlı tahmini ilan fiyatı uygulaması</footer>
    </main>
  </div>;
}
