# OtoDeğer – İkinci El Araç Fiyat Tahmini

Türkçe arayüze sahip, ikinci el araçların tahmini piyasa değerini gösteren React uygulaması.

## Mimari
- `src/`: React + Vite arayüzü
- `backend/`: FastAPI servisi ve Random Forest modeli
- Frontend, `/api/predict` endpoint'ine araç bilgilerini JSON olarak gönderir.
- Backend, Colab defterindeki veri üretim adımını ve RandomForestRegressor pipeline'ını kullanır.

## Özellikler
- Araç marka/modeli, model yılı, kilometre, yakıt, vites, kasa ve durum bilgisi girişi
- Tahmini fiyat ve olası fiyat aralığı gösterimi
- Tahmin geçmişinin tarayıcı LocalStorage alanında saklanması
- Random Forest modelinden API üzerinden gerçek tahmin alınması
- Tahmin geçmişinde arama
- Örnek fiyat eğilimi grafiği
- Mobil uyumlu, kurumsal Light arayüz

## Kullanılan teknolojiler
- React 18
- Vite 6
- Recharts
- Lucide React
- CSS

## Kurulum
Node.js LTS ve npm kurulu olmalıdır.

```bash
npm install
npm run dev
```

Tarayıcıda Vite tarafından gösterilen yerel adresi açın.

## Üretim derlemesi
```bash
npm run build
npm run preview
```

Derleme çıktısı `dist/` klasörüne oluşturulur.

## Backend'i yerel çalıştırma
Python 3.11+ önerilir.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API dokümantasyonu: `http://localhost:8000/docs`
Sağlık kontrolü: `http://localhost:8000/api/health`

## Frontend'i backend'e bağlama
Varsayılan olarak frontend `http://localhost:8000` adresini kullanır. Yayında backend adresini Vercel ortam değişkeni olarak tanımlayın:

- `VITE_API_URL` = Render üzerinde yayınlanan API adresi (sonunda `/` olmadan)
- `ALLOWED_ORIGINS` = Vercel alan adınız (ör. `https://proje-adiniz.vercel.app`); birden fazla alan adı virgülle ayrılabilir.

Ortam değişkeni değiştiğinde Vercel'de yeniden deploy edin.

## Yayınlama
1. Proje kökündeki `render.yaml` ayarlarını kullanarak backend klasörünü Render üzerinde Web Service olarak yayınlayın. Build: `pip install -r requirements.txt`; Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
2. Frontend'i Vercel üzerinde GitHub deposuna bağlayarak yayınlayın. Framework Preset: Vite; Build Command: `npm run build`; Output Directory: `dist`.
3. Render servisinde `ALLOWED_ORIGINS` ortam değişkenini Vercel alan adınıza ayarlayın.
4. Vercel projesinde `VITE_API_URL` ortam değişkenini Render API adresine ayarlayın ve yeniden deploy edin.

## Yapay zekâ kullanım notu
Proje planlama, arayüz bileşenlerinin oluşturulması, CSS düzeni ve başlangıç dokümantasyonu aşamalarında yapay zekâ asistanından yararlanılmıştır. Üretilen kodların çalıştırılarak ve test edilerek doğrulanması gerekir.

## Model ve veri hakkında önemli not
Uygulamadaki tahmin artık React içindeki sabit formülle değil, FastAPI üzerinden sunulan `RandomForestRegressor` modeliyle yapılır. Model, önceki Colab çalışmasındaki aynı 1.000 satırlık sentetik veri üretimini, %80/%20 eğitim-test ayrımını ve ön işleme hattını kullanır. Yeniden eğitim çalıştırıldığında beklenen test metrikleri MAE 114.843 TL, RMSE 145.321 TL ve R² 0,890'dır.

**Bu veri gerçek ilanlardan veya gerçekleşmiş satışlardan toplanmamıştır.** Dolayısıyla modelin tahminleri gerçek ikinci el araç piyasasını temsil ettiği iddiasıyla sunulmamalıdır. Gerçek kullanım için güncel ve temsil gücü yüksek ilan/satış verileriyle yeniden eğitim ve bağımsız değerlendirme gerekir.

Grafikteki örnek fiyat eğilimi de temsili veridir; canlı piyasa verisi olarak yorumlanmamalıdır.
