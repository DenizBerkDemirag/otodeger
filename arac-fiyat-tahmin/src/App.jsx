import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, BadgeCheck, Bell, CarFront, ChevronDown,
  CircleHelp, Clock3, LayoutDashboard, Menu, Search, Settings2,
  SlidersHorizontal, Sparkles, TrendingUp, Wallet, X
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const initialForm = {
  brand: "Renault", model: "Clio", year: "2021", mileage: "65000",
  fuel: "Benzin", transmission: "Otomatik", engine: "1.6", damage: "Hayır"
};

// Seçenekler, Colab notebookundaki eğitim verisiyle aynı kategorilerden gelir.
const brands = {
  Toyota: ["Corolla", "Yaris"], Renault: ["Clio", "Megane"],
  Fiat: ["Egea", "Punto"], Volkswagen: ["Golf", "Polo"],
  Ford: ["Focus", "Fiesta"], Hyundai: ["i20", "i30"]
};

const trend = [
  { month: "Haz", price: 890 }, { month: "Tem", price: 905 }, { month: "Ağu", price: 920 },
  { month: "Eyl", price: 934 }, { month: "Eki", price: 951 }, { month: "Kas", price: 985 }
];

const money = (value) => new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", maximumFractionDigits: 0
}).format(value);

const today = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric", month: "long", year: "numeric"
}).format(new Date());

function App() {
  const [form, setForm] = useState(initialForm);
  const [estimate, setEstimate] = useState(null);
  const [estimateRange, setEstimateRange] = useState(null);
  const [hasEstimated, setHasEstimated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiStatus, setApiStatus] = useState("Kontrol ediliyor");
  const [modelMetrics, setModelMetrics] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("otodeger-history")) || []; }
    catch { return []; }
  });
  const [activeNav, setActiveNav] = useState("Genel Bakış");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const update = (key, value) => setForm(current => ({
    ...current, [key]: value, ...(key === "brand" ? { model: brands[value][0] } : {})
  }));

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(response => { if (!response.ok) throw new Error("API yanıt vermedi"); return response.json(); })
      .then(data => { setApiStatus("Sistem aktif"); setModelMetrics(data.metrikler); })
      .catch(() => setApiStatus("API bağlantısı yok"));
  }, []);

  const runEstimate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setApiError("");
    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marka: form.brand, model: form.model, yil: Number(form.year),
          kilometre: Number(form.mileage), yakit: form.fuel,
          vites: form.transmission, motor_hacmi: Number(form.engine), hasarli: form.damage
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Tahmin isteği başarısız oldu.");
      const price = data.tahmini_fiyat_tl;
      setEstimate(price);
      setEstimateRange({ low: data.alt_deger_tl, high: data.ust_deger_tl });
      setHasEstimated(true);
      const item = {
        id: Date.now(),
        name: `${form.year} ${form.brand} ${form.model}`,
        detail: `${Number(form.mileage).toLocaleString("tr-TR")} km · ${form.fuel} · ${form.transmission} · ${form.engine}L · Hasar: ${form.damage}`,
        price,
        date: "Az önce"
      };
      const next = [item, ...history].slice(0, 8);
      setHistory(next);
      localStorage.setItem("otodeger-history", JSON.stringify(next));
    } catch (error) {
      setApiError(error.message || "Sunucuya ulaşılamadı. Backend servisinin çalıştığını kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => history.filter(item =>
    `${item.name} ${item.detail}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))
  ), [history, query]);

  const navItems = [
    { label: "Genel Bakış", icon: LayoutDashboard },
    { label: "Fiyat Tahmini", icon: CarFront },
    { label: "Tahmin Geçmişi", icon: Clock3 }
  ];

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><CarFront size={22} strokeWidth={2.4} /></div>
          <div><strong>oto<span>değer</span></strong><small>AKILLI ARAÇ ANALİZİ</small></div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>
        </div>
        <div className="workspace-label">ÇALIŞMA ALANI</div>
        <nav className="nav-list">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => { setActiveNav(label); setMobileOpen(false); }}>
              <Icon size={18}/><span>{label}</span>{label === "Tahmin Geçmişi" && <span className="nav-count">{history.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={17}/></div>
            <strong>Yardıma mı ihtiyacınız var?</strong>
            <p>Uygulamanın kullanımı hakkında bilgi alın.</p>
            <button onClick={() => alert("Araç bilgilerini doldurun ve Fiyatı tahmin et butonuna basın. Sonuçlar Tahmin Geçmişi bölümünde saklanır.")}>Yardım merkezine git <span>↗</span></button>
          </div>
          <div className="profile">
            <div className="avatar">DK</div><div className="profile-info"><strong>Demo Kullanıcı</strong><small>Standart hesap</small></div>
            <button className="icon-button"><Settings2 size={17}/></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
            <div className="breadcrumb">Uygulama <span>/</span> <strong>{activeNav}</strong></div>
          </div>
          <div className="topbar-right">
            <span className="live-indicator"><i/> {apiStatus}</span>
            <button className="icon-button notification" aria-label="Bildirimler"><Bell size={18}/><i/></button>
            <div className="top-avatar">DK</div>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><Sparkles size={14}/> ARAÇ DEĞERLEME PLATFORMU</div>
              <h1>{activeNav === "Tahmin Geçmişi" ? "Tahmin geçmişiniz" : activeNav === "Fiyat Tahmini" ? "Araç fiyatını tahmin edin" : "Hoş geldiniz"}</h1>
              <p className="page-subtitle">{activeNav === "Tahmin Geçmişi" ? "Daha önce gerçekleştirdiğiniz araç değerlemelerini inceleyin." : "Aracınızın tahmini piyasa değerini birkaç adımda öğrenin."}</p>
            </div>
            <div className="date-chip"><Clock3 size={15}/> {today}</div>
          </section>

          <section className="stats-grid">
            <StatCard icon={Wallet} label="Son tahmin" value={estimate === null ? "—" : money(estimate)} change="Modelin son hesapladığı değer" tone="blue"/>
            <StatCard icon={Activity} label="Toplam tahmin" value={String(history.length).padStart(2, "0")} change="Kaydedilen değerleme" tone="violet"/>
            <StatCard icon={TrendingUp} label="Model R² skoru" value={modelMetrics ? String(modelMetrics.r2).replace(".", ",") : "—"} change="Sentetik test verisi" tone="green"/>
          </section>

          <div className="main-grid">
            <section className="panel estimate-panel">
              <div className="panel-heading">
                <div><div className="section-kicker">HIZLI DEĞERLEME</div><h2>Araç bilgileri</h2><p>Doğru bir tahmin için araç detaylarını girin.</p></div>
                <div className="heading-icon"><SlidersHorizontal size={19}/></div>
              </div>
              <form onSubmit={runEstimate}>
                <div className="form-grid">
                  <Field label="Marka">
                    <select value={form.brand} onChange={e => update("brand", e.target.value)}>
                      {Object.keys(brands).map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Model">
                    <select value={form.model} onChange={e => update("model", e.target.value)}>
                      {brands[form.brand].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Model yılı">
                    <select value={form.year} onChange={e => update("year", e.target.value)}>
                      {Array.from({length: 21}, (_, i) => String(2025-i)).map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Kilometre">
                    <div className="input-suffix"><input type="number" min="0" max="1000000" required value={form.mileage} onChange={e => update("mileage", e.target.value)}/><span>km</span></div>
                  </Field>
                  <Field label="Yakıt türü">
                    <select value={form.fuel} onChange={e => update("fuel", e.target.value)}>
                      {["Benzin", "Dizel", "LPG", "Hibrit"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Vites tipi">
                    <select value={form.transmission} onChange={e => update("transmission", e.target.value)}>
                      {["Manuel", "Otomatik"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Motor hacmi">
                    <select value={form.engine} onChange={e => update("engine", e.target.value)}>
                      {["1.0", "1.2", "1.4", "1.6", "1.8", "2.0"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Hasar durumu">
                    <select value={form.damage} onChange={e => update("damage", e.target.value)}>
                      {["Hayır", "Evet"].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="form-footer">
                  <span><BadgeCheck size={15}/> Tahmin Random Forest modeliyle API üzerinden yapılır.</span>
                  <button className="primary-button" type="submit" disabled={loading}><Sparkles size={16}/> {loading ? "Model hesaplıyor..." : "Fiyatı tahmin et"}</button>
                </div>
              </form>
              {apiError && <div className="api-error" role="alert">{apiError}</div>}
            </section>

            <section className="panel result-panel">
              <div className="result-top">
                <div><div className="section-kicker">TAHMİN SONUCU</div><h2>Aracınızın değeri</h2></div>
                <div className="result-icon"><CarFront size={21}/></div>
              </div>
              <div className="result-visual">
                <div className="car-illustration"><CarFront size={72} strokeWidth={1.1}/></div>
                <div className="result-label">{hasEstimated ? `${form.year} ${form.brand} ${form.model}` : "Henüz tahmin yapılmadı"}</div>
                <div className="result-price">{estimate === null ? "—" : money(estimate)}</div>
                <div className="result-caption"><span className="dot-green"/> Tahmini piyasa değeri</div>
              </div>
              <div className="range-box">
                <div className="range-head"><span>Olası değer aralığı</span><strong>{estimateRange ? `${money(estimateRange.low)} – ${money(estimateRange.high)}` : "—"}</strong></div>
                <div className="range-track"><i/></div>
                <div className="range-foot"><span>Daha düşük</span><span>Daha yüksek</span></div>
              </div>
              <div className="notice"><CircleHelp size={16}/><p>Model, Colab projesindeki sentetik veriyle eğitilmiştir. Tahmin gerçek piyasa fiyatı veya ekspertiz raporu yerine geçmez.</p></div>
            </section>
          </div>

          <section className="panel history-panel">
            <div className="panel-heading history-heading">
              <div><div className="section-kicker">SON İŞLEMLER</div><h2>Son fiyat tahminleri</h2><p>Kaydedilen son araç değerlemeleriniz.</p></div>
              <div className="history-actions">
                <div className="search-box"><Search size={16}/><input placeholder="Araç ara..." value={query} onChange={e => setQuery(e.target.value)}/></div>
                <button className="secondary-button" onClick={() => setActiveNav("Tahmin Geçmişi")}>Tümünü gör <ChevronDown size={15}/></button>
              </div>
            </div>
            <div className="table-wrap">
              <table><thead><tr><th>ARAÇ</th><th>ARAÇ ÖZELLİKLERİ</th><th>TAHMİNİ DEĞER</th><th>TARİH</th><th></th></tr></thead>
                <tbody>{filteredHistory.slice(0, 4).map(item => <tr key={item.id}>
                  <td><div className="vehicle-cell"><div className="vehicle-thumb"><CarFront size={19}/></div><strong>{item.name}</strong></div></td>
                  <td className="muted-cell">{item.detail}</td><td className="price-cell">{money(item.price)}</td><td className="muted-cell">{item.date}</td>
                  <td><button className="row-more" title="Detay"><ChevronDown size={16}/></button></td>
                </tr>)}</tbody>
              </table>
              {filteredHistory.length === 0 && <div className="empty-state">Aramanızla eşleşen kayıt bulunamadı.</div>}
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel trend-panel">
              <div className="panel-heading"><div><div className="section-kicker">PİYASA ANALİZİ</div><h2>Örnek fiyat eğilimi</h2><p>Arayüz örneği için kullanılan temsili veriler.</p></div><span className="trend-badge"><ArrowUpRight size={14}/> %10,7</span></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top: 8, right: 8, left: -18, bottom: 0}}>
                <defs><linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3978e8" stopOpacity={0.2}/><stop offset="100%" stopColor="#3978e8" stopOpacity={0.01}/></linearGradient></defs>
                <CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#8993a5",fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#8993a5",fontSize:11}} tickFormatter={v => `${v}K`}/>
                <Tooltip formatter={v => [`${v.toLocaleString("tr-TR")} bin TL`, "Örnek değer"]} contentStyle={{border:"1px solid #e8edf5",borderRadius:12,fontSize:12}}/>
                <Area type="monotone" dataKey="price" stroke="#3978e8" strokeWidth={2.5} fill="url(#fillPrice)" />
              </AreaChart></ResponsiveContainer></div>
            </div>
            <div className="insight-card"><div className="insight-icon"><Sparkles size={19}/></div><div className="section-kicker">AKILLI İPUCU</div><h3>Eksiksiz bilgi, daha anlamlı tahmin.</h3><p>Aracınızın kilometre ve donanım bilgilerini doğru girmek, tahmin sonucunun yorumlanmasını kolaylaştırır.</p><div className="insight-foot"><span/> Bilgilendirme amaçlı öneri</div></div>
          </section>
          <footer>© {new Date().getFullYear()} OtoDeğer · İkinci el araç değerleme demo uygulaması <span>Gizlilik · Kullanım koşulları</span></footer>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function StatCard({ icon: Icon, label, value, change, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-change">{change}</div></div>;
}

export default App;