import logging
import os
from typing import Literal
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from train_model import ARTIFACT_PATH, train_and_save

logger = logging.getLogger(__name__)

VEHICLE_MODELS = {
    "Toyota": ["Corolla", "Yaris"],
    "Renault": ["Clio", "Megane"],
    "Fiat": ["Egea", "Punto"],
    "Volkswagen": ["Golf", "Polo"],
    "Ford": ["Focus", "Fiesta"],
    "Hyundai": ["i20", "i30"],
}

if ARTIFACT_PATH.exists():
    artifact = joblib.load(ARTIFACT_PATH)
    model, metrics = artifact["model"], artifact["metrics"]
else:
    model, metrics = train_and_save()

app = FastAPI(
    title="OtoDeğer Araç Fiyat Tahmin API",
    description="Colab projesindeki Random Forest modelini kullanan demo API.",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

class VehicleInput(BaseModel):
    marka: Literal["Toyota", "Renault", "Fiat", "Volkswagen", "Ford", "Hyundai"]
    model: str = Field(min_length=1, max_length=40)
    yil: int = Field(ge=2005, le=2025)
    kilometre: int = Field(ge=0, le=1_000_000)
    yakit: Literal["Benzin", "Dizel", "LPG", "Hibrit"]
    vites: Literal["Manuel", "Otomatik"]
    motor_hacmi: float = Field(ge=0.8, le=5.0)
    hasarli: Literal["Hayır", "Evet"]

    @model_validator(mode="after")
    def validate_model_for_brand(self):
        if self.model not in VEHICLE_MODELS[self.marka]:
            raise ValueError("Seçilen marka ve model birbiriyle eşleşmiyor.")
        return self

@app.get("/")
def root():
    return {"mesaj": "OtoDeğer API çalışıyor", "dokumantasyon": "/docs"}

@app.get("/api/health")
def health():
    return {"durum": "aktif", "model": "RandomForestRegressor", "metrikler": metrics}

@app.get("/api/options")
def options():
    return {
        "markalar": VEHICLE_MODELS,
        "yakitlar": ["Benzin", "Dizel", "LPG", "Hibrit"],
        "vitesler": ["Manuel", "Otomatik"],
        "motor_hacimleri": [1.0, 1.2, 1.4, 1.6, 1.8, 2.0],
        "hasar_durumlari": ["Hayır", "Evet"]
    }

@app.post("/api/predict")
def predict(vehicle: VehicleInput):
    try:
        row = pd.DataFrame([{
            "Marka": vehicle.marka,
            "Model": vehicle.model,
            "Yil": vehicle.yil,
            "Kilometre": vehicle.kilometre,
            "Yakit": vehicle.yakit,
            "Vites": vehicle.vites,
            "Motor_Hacmi": vehicle.motor_hacmi,
            "Hasarli": vehicle.hasarli
        }])
        price = max(0, float(model.predict(row)[0]))
        return {
            "tahmini_fiyat_tl": round(price),
            "alt_deger_tl": round(price * 0.94),
            "ust_deger_tl": round(price * 1.06),
            "model": "RandomForestRegressor",
            "veri_notu": "Model, Colab projesindeki 1.000 satırlık sentetik veriyle eğitilmiştir. Sonuç gerçek piyasa fiyatı garantisi değildir."
        }
    except Exception as exc:
        logger.exception("Araç fiyatı tahmin edilirken hata oluştu.")
        raise HTTPException(
            status_code=500,
            detail="Tahmin şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin."
        ) from exc
