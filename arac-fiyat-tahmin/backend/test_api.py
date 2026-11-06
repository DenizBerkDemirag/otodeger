from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint_reports_model():
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["durum"] == "aktif"
    assert payload["model"] == "RandomForestRegressor"
    assert payload["metrikler"]["kayit_sayisi"] == 1000


def test_predict_returns_price_range():
    response = client.post("/api/predict", json={
        "marka": "Renault", "model": "Clio", "yil": 2021,
        "kilometre": 65000, "yakit": "Benzin", "vites": "Otomatik",
        "motor_hacmi": 1.6, "hasarli": "Hayır"
    })
    assert response.status_code == 200
    payload = response.json()
    assert payload["tahmini_fiyat_tl"] > 0
    assert payload["alt_deger_tl"] < payload["tahmini_fiyat_tl"] < payload["ust_deger_tl"]


def test_invalid_year_is_rejected():
    response = client.post("/api/predict", json={
        "marka": "Renault", "model": "Clio", "yil": 2035,
        "kilometre": 65000, "yakit": "Benzin", "vites": "Otomatik",
        "motor_hacmi": 1.6, "hasarli": "Hayır"
    })
    assert response.status_code == 422


def test_model_must_belong_to_selected_brand():
    response = client.post("/api/predict", json={
        "marka": "Renault", "model": "Corolla", "yil": 2021,
        "kilometre": 65000, "yakit": "Benzin", "vites": "Otomatik",
        "motor_hacmi": 1.6, "hasarli": "Hayır"
    })
    assert response.status_code == 422
