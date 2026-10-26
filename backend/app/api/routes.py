from fastapi import APIRouter, Query
from typing import Optional
from app.models import (
    EnvironmentInput, 
    PredictionOutput, 
    DiagnoseInput, 
    DiagnoseOutput, 
    WeatherImpactOutput
)
from app.services.prediction_engine import predict_network_performance, diagnose_measurement
from app.services.weather_service import get_live_weather_impact
from app.services.rf_physics import MATERIAL_ATTENUATION_BASE, FREQUENCY_MAP


router = APIRouter(prefix="/api", tags=["network-context"])


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "NEXIS Environmental & RF Telemetry Engine"}


@router.post("/predict", response_model=PredictionOutput)
async def predict_speed(env: EnvironmentInput):
    """
    Predicts achievable throughput, latency, RSSI, and SNR by calculating
    distance path loss, wall materials, time-of-day congestion, and weather.
    """
    return await predict_network_performance(env)


@router.post("/diagnose", response_model=DiagnoseOutput)
async def diagnose(diag: DiagnoseInput):
    """
    Compares real-world measured speed against environmentally-predicted performance
    to pinpoint the primary bottleneck (e.g. concrete wall, peak hours, device tier, ISP line).
    """
    return await diagnose_measurement(diag)


@router.get("/weather", response_model=WeatherImpactOutput)
async def get_weather(
    lat: Optional[float] = Query(default=6.9271, description="Latitude"),
    lon: Optional[float] = Query(default=79.8612, description="Longitude"),
    distance_m: Optional[float] = Query(default=10.0, description="Link distance in meters")
):
    """
    Fetches real-time weather conditions and computes rain fade attenuation across frequency bands.
    """
    return await get_live_weather_impact(latitude=lat, longitude=lon, distance_meters=distance_m)


@router.get("/materials")
def get_materials():
    """
    Returns the catalog of recognized physical barrier materials and their baseline dB loss.
    """
    return {
        "materials": [
            {"id": k, "name": k.capitalize(), "base_attenuation_db": v}
            for k, v in MATERIAL_ATTENUATION_BASE.items()
        ],
        "frequencies_ghz": FREQUENCY_MAP
    }
