from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class ObstacleItem(BaseModel):
    material: str = Field(..., description="drywall, wood, brick, concrete, metal, glass")
    count: int = Field(default=1, ge=1, le=20)


class EnvironmentInput(BaseModel):
    connection_type: str = Field(
        default="WIFI_5", 
        description="WIFI_2_4, WIFI_5, WIFI_6, WIFI_7, LTE, 5G_SUB6, 5G_MMWAVE"
    )
    base_speed_mbps: float = Field(
        default=100.0, 
        ge=1.0, 
        le=10000.0, 
        description="Subscribed plan speed or nominal line rate in Mbps"
    )
    distance_meters: float = Field(
        default=5.0, 
        ge=0.5, 
        le=50000.0, 
        description="Distance from Wi-Fi router / Access Point or Cellular Base Station"
    )
    obstacles: List[ObstacleItem] = Field(default_factory=list)
    device_tier: str = Field(
        default="MID_MIMO", 
        description="LOW_SISO (1x1), MID_MIMO (2x2 Wi-Fi 5/6), FLAGSHIP (Wi-Fi 7 / 5G SA multi-stream)"
    )
    time_of_day_hour: Optional[int] = Field(default=None, ge=0, le=23)
    is_indoor: bool = Field(default=True)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AttenuationBreakdown(BaseModel):
    distance_loss_db: float
    obstacle_loss_db: float
    weather_loss_db: float
    total_loss_db: float


class PredictionOutput(BaseModel):
    predicted_download_mbps: float
    predicted_upload_mbps: float
    predicted_latency_ms: float
    estimated_rssi_dbm: float
    estimated_snr_db: float
    signal_quality: str
    attenuation_breakdown: AttenuationBreakdown
    congestion_impact_pct: float
    device_efficiency_pct: float
    bottlenecks: List[str]
    recommendations: List[str]


class DiagnoseInput(BaseModel):
    measured_download_mbps: float
    measured_latency_ms: float
    measured_loss_pct: float = 0.0
    measured_jitter_ms: Optional[float] = 0.0
    environment: EnvironmentInput


class DiagnoseOutput(BaseModel):
    expected_download_mbps: float
    measured_download_mbps: float
    deficit_pct: float
    primary_bottleneck: str
    performance_score: str
    detailed_findings: List[str]
    action_items: List[str]


class WeatherImpactOutput(BaseModel):
    latitude: float
    longitude: float
    temperature_c: float
    humidity_pct: float
    precipitation_mm: float
    condition_description: str
    attenuation_db: Dict[str, float]
    impact_level: str
    advisory: str
