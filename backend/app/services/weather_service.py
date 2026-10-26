import httpx
from typing import Dict, Optional, Tuple
from app.models import WeatherImpactOutput


WEATHER_CODE_DESCRIPTIONS: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def calculate_itu_rain_attenuation(rain_rate_mm_hr: float, freq_ghz: float, distance_km: float) -> float:
    """
    Approximation of ITU-R P.838 specific attenuation: gamma_R = k * R^alpha (dB/km)
    For sub-6GHz, attenuation is negligible (< 0.1 dB).
    For 28GHz mmWave and satellite, attenuation is substantial.
    """
    if rain_rate_mm_hr <= 0.1:
        return 0.0
    
    # Frequency-dependent coefficients (ITU-R P.838 simplified approximation)
    if freq_ghz <= 6.0:
        k = 0.0001 * (freq_ghz ** 1.8)
        alpha = 1.05
    elif freq_ghz <= 30.0:
        k = 0.003 * (freq_ghz ** 1.3)
        alpha = 1.02
    else:
        k = 0.12
        alpha = 0.95
        
    gamma_r = k * (rain_rate_mm_hr ** alpha)
    total_db = gamma_r * max(0.01, distance_km)
    return round(total_db, 2)


async def get_live_weather_impact(
    latitude: Optional[float] = None, 
    longitude: Optional[float] = None,
    distance_meters: float = 10.0
) -> WeatherImpactOutput:
    # Default fallback (e.g. Colombo, Sri Lanka / standard tropical/urban default if lat/lng not provided)
    lat = latitude if latitude is not None else 6.9271
    lon = longitude if longitude is not None else 79.8612
    distance_km = distance_meters / 1000.0

    temp_c = 28.0
    humidity = 75.0
    precip_mm = 0.0
    weather_desc = "Clear sky"

    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("current", {})
                temp_c = data.get("temperature_2m", 28.0)
                humidity = data.get("relative_humidity_2m", 75.0)
                precip_mm = data.get("precipitation", 0.0)
                code = data.get("weather_code", 0)
                weather_desc = WEATHER_CODE_DESCRIPTIONS.get(code, "Clear")
    except Exception:
        # Fallback to nominal weather if offline or timeout
        pass

    # Calculate attenuation across key bands
    rain_rate = precip_mm * 2.0  # estimate instant mm/hr from recent precipitation
    att_2_4 = calculate_itu_rain_attenuation(rain_rate, 2.4, distance_km)
    att_5 = calculate_itu_rain_attenuation(rain_rate, 5.2, distance_km)
    att_sub6 = calculate_itu_rain_attenuation(rain_rate, 3.5, distance_km)
    att_mmwave = calculate_itu_rain_attenuation(rain_rate, 28.0, distance_km)

    impact_level = "Negligible"
    advisory = "Weather is nominal; atmospheric impact on Wi-Fi and cellular is negligible."

    if precip_mm > 5.0 or "Heavy" in weather_desc or "Thunderstorm" in weather_desc:
        impact_level = "High"
        advisory = "Significant precipitation detected. 5G mmWave and fixed wireless/satellite links will suffer noticeable rain fade."
    elif precip_mm > 0.5 or "rain" in weather_desc.lower():
        impact_level = "Moderate"
        advisory = "Moderate rain detected. Indoor Wi-Fi remains unaffected, but outdoor wireless paths may show slight packet jitter."

    return WeatherImpactOutput(
        latitude=round(lat, 4),
        longitude=round(lon, 4),
        temperature_c=round(temp_c, 1),
        humidity_pct=round(humidity, 1),
        precipitation_mm=round(precip_mm, 2),
        condition_description=weather_desc,
        attenuation_db={
            "2.4GHz": att_2_4,
            "5GHz": att_5,
            "5G_Sub6": att_sub6,
            "5G_mmWave": att_mmwave,
        },
        impact_level=impact_level,
        advisory=advisory
    )
