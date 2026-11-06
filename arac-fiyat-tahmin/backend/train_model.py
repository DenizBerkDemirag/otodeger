"""Colab notebookundaki sentetik veri üretimini ve Random Forest hattını tekrarlar."""
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

RANDOM_STATE = 42
ARTIFACT_PATH = Path(__file__).with_name("model.joblib")


def create_dataset() -> pd.DataFrame:
    np.random.seed(RANDOM_STATE)
    n = 1000
    markalar = np.random.choice(
        ["Toyota", "Renault", "Fiat", "Volkswagen", "Ford", "Hyundai"],
        size=n, p=[0.18, 0.20, 0.18, 0.16, 0.14, 0.14]
    )
    model_haritasi = {
        "Toyota": ["Corolla", "Yaris"], "Renault": ["Clio", "Megane"],
        "Fiat": ["Egea", "Punto"], "Volkswagen": ["Golf", "Polo"],
        "Ford": ["Focus", "Fiesta"], "Hyundai": ["i20", "i30"]
    }
    modeller = [np.random.choice(model_haritasi[m]) for m in markalar]
    yil = np.random.randint(2005, 2026, n)
    kilometre = np.random.randint(5000, 280001, n)
    yakit = np.random.choice(["Benzin", "Dizel", "LPG", "Hibrit"], n, p=[0.42, 0.35, 0.15, 0.08])
    vites = np.random.choice(["Manuel", "Otomatik"], n, p=[0.55, 0.45])
    motor = np.random.choice([1.0, 1.2, 1.4, 1.6, 1.8, 2.0], n)
    hasarli = np.random.choice(["Hayır", "Evet"], n, p=[0.78, 0.22])
    marka_prim = {
        "Toyota": 180000, "Renault": 70000, "Fiat": 40000,
        "Volkswagen": 170000, "Ford": 90000, "Hyundai": 80000
    }
    fiyat = (
        250000 + (yil - 2005) * 65000 - kilometre * 2.1
        + np.array([marka_prim[m] for m in markalar])
        + np.where(yakit == "Hibrit", 180000, 0)
        + np.where(yakit == "Dizel", 50000, 0)
        + np.where(vites == "Otomatik", 110000, 0)
        + (motor - 1.0) * 70000
        - np.where(hasarli == "Evet", 150000, 0)
        + np.random.normal(0, 130000, n)
    )
    fiyat = np.clip(fiyat, 180000, None)
    return pd.DataFrame({
        "Marka": markalar, "Model": modeller, "Yil": yil,
        "Kilometre": kilometre, "Yakit": yakit, "Vites": vites,
        "Motor_Hacmi": motor, "Hasarli": hasarli,
        "Fiyat_TL": fiyat.round(0).astype(int)
    })


def train_and_save():
    df = create_dataset()
    X = df.drop(columns=["Fiyat_TL"])
    y = df["Fiyat_TL"]
    numeric = ["Yil", "Kilometre", "Motor_Hacmi"]
    categorical = ["Marka", "Model", "Yakit", "Vites", "Hasarli"]
    numeric_pipe = Pipeline([("imputer", SimpleImputer(strategy="median"))])
    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore"))
    ])
    preprocessing = ColumnTransformer([
        ("sayisal", numeric_pipe, numeric),
        ("kategorik", categorical_pipe, categorical)
    ])
    pipeline = Pipeline([
        ("on_isleme", preprocessing),
        ("regresyon", RandomForestRegressor(
            n_estimators=250, random_state=RANDOM_STATE,
            min_samples_leaf=2, n_jobs=-1
        ))
    ])
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE
    )
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)
    metrics = {
        "mae_tl": round(float(mean_absolute_error(y_test, predictions))),
        "rmse_tl": round(float(np.sqrt(mean_squared_error(y_test, predictions)))),
        "r2": round(float(r2_score(y_test, predictions)), 3),
        "kayit_sayisi": int(len(df)),
        "egitim_kaydi": int(len(X_train)),
        "test_kaydi": int(len(X_test)),
        "veri_turu": "Sentetik eğitim verisi"
    }
    joblib.dump({"model": pipeline, "metrics": metrics}, ARTIFACT_PATH)
    return pipeline, metrics


if __name__ == "__main__":
    _, result = train_and_save()
    print("Model kaydedildi:", ARTIFACT_PATH)
    print(result)
