import json
import logging
import os
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("otodeger")

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "otodeger_best_model.joblib"))
METADATA_PATH = Path(os.getenv("METADATA_PATH", BASE_DIR / "model_metadata.json"))

if not MODEL_PATH.exists():
    raise RuntimeError(
        f"Model dosyası bulunamadı: {MODEL_PATH}. "
        "otodeger_best_model.joblib dosyasını backend klasörüne ekleyin."
    )

model = joblib.load(MODEL_PATH)
metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8")) if METADATA_PATH.exists() else {}

FEATURE_COLUMNS = metadata.get("feature_columns", [
    "brand", "fuel", "body", "transmission", "engine", "city",
    "district", "color", "seller", "damage", "year", "km", "vehicle_model"
])
NUMERIC_FEATURES = set(metadata.get("numeric_features", ["year", "km"]))

# Seçenekleri doğrudan eğitilmiş Pipeline içindeki OneHotEncoder kategorilerinden al.
def load_model_options() -> dict[str, list[Any]]:
    try:
        preprocess = model.named_steps["preprocess"]
        encoder = preprocess.named_transformers_["cat"].named_steps["onehot"]
        categorical_columns = preprocess.transformers_[1][2]
        result = {}
        for column, categories in zip(categorical_columns, encoder.categories_):
            values = [v.item() if hasattr(v, "item") else v for v in categories]
            result[column] = sorted(values, key=lambda x: str(x).casefold())
        return result
    except Exception:
        logger.exception("Model kategorileri okunamadı.")
        return {}

OPTIONS = load_model_options()

class VehicleInput(BaseModel):
    brand: str = Field(min_length=1)
    fuel: str = Field(min_length=1)
    body: str = Field(min_length=1)
    transmission: str = Field(min_length=1)
    engine: str = Field(min_length=1)
    city: str = Field(min_length=1)
    district: str = Field(min_length=1)
    color: str = Field(min_length=1)
    seller: str = Field(min_length=1)
    damage: str = Field(min_length=1)
    year: int = Field(ge=1950, le=2035)
    km: int = Field(ge=0, le=2_000_000)
    vehicle_model: str = Field(min_length=1)

app = FastAPI(
    title="OtoDeğer API",
    description="Türkiye ikinci el araç ilan fiyatı tahmin servisi.",
    version="2.0.0"
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

@app.get("/")
def root():
    return {"mesaj": "OtoDeğer API çalışıyor", "dokumantasyon": "/docs"}

@app.get("/api/health")
def health():
    metrics = metadata.get("metrics", {})
    return {
        "durum": "aktif",
        "model": metadata.get("selected_model", "Random Forest"),
        "metrikler": {
            "mae": metrics.get("MAE_TL"),
            "rmse": metrics.get("RMSE_TL"),
            "r2": metrics.get("R2")
        },
        "egitim_kaydi": metadata.get("training_rows"),
        "test_kaydi": metadata.get("test_rows"),
        "veri_turu": "Türkiye ikinci el araç ilan verisi"
    }

@app.get("/api/options")
def options():
    return {
        "secenekler": OPTIONS,
        "alanlar": FEATURE_COLUMNS,
        "sayisal_alanlar": sorted(NUMERIC_FEATURES)
    }

@app.post("/api/predict")
def predict(vehicle: VehicleInput):
    try:
        values = vehicle.model_dump()
        row = pd.DataFrame([{column: values[column] for column in FEATURE_COLUMNS}])
        for column in NUMERIC_FEATURES:
            row[column] = pd.to_numeric(row[column], errors="raise")

        price = float(model.predict(row)[0])
        if not pd.notna(price):
            raise ValueError("Model geçerli bir tahmin üretemedi.")
        price = max(0, price)

        # Bu aralık istatistiksel güven aralığı değil, yalnızca yaklaşık sunum aralığıdır.
        return {
            "tahmini_fiyat_tl": round(price),
            "alt_deger_tl": round(price * 0.94),
            "ust_deger_tl": round(price * 1.06),
            "model": metadata.get("selected_model", "Random Forest"),
            "veri_notu": (
                "Tahmin, Türkiye ikinci el araç ilan verileriyle eğitilmiş modele dayanır. "
                "İlan fiyatı gerçekleşmiş satış fiyatı değildir; sonuç ekspertiz veya "
                "kesin piyasa değeri garantisi vermez."
            )
        }
    except Exception as exc:
        logger.exception("Araç fiyatı tahmin edilirken hata oluştu.")
        raise HTTPException(
            status_code=500,
            detail="Tahmin oluşturulamadı. Girilen araç bilgilerini kontrol edip tekrar deneyin."
        ) from exc
