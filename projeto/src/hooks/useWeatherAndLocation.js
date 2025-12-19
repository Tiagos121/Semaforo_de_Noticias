import React, { useState, useEffect, useCallback } from 'react';

// ====================================================================
// CONFIGURAÇÃO E CHAVES DE API
// ====================================================================
const getEnvKey = (keyName, fallbackValue) => import.meta.env[keyName] || fallbackValue;

const LOCATIONIQ_API_KEY = getEnvKey('VITE_LOCATIONIQ_API_KEY', '');
const LOCATIONIQ_URL = "https://us1.locationiq.com/v1/reverse.php";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// CACHE PARA LOCALIZAÇÃO: Evita 429 no LocationIQ
const LOCATION_CACHE_KEY = 'cached_user_location';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de cache

const getCachedLocation = () => {
    try {
        const raw = localStorage.getItem(LOCATION_CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.ts < CACHE_TTL_MS) {
            if (data.location.city) {
                data.location.city = simplifyCityName(data.location.city);
            }
            return data.location;
        }
        localStorage.removeItem(LOCATION_CACHE_KEY);
        return null;
    } catch {
        return null;
    }
};

const setCachedLocation = (location) => {
    try {
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
            ts: Date.now(),
            location,
        }));
    } catch {
        // Falha ao guardar no cache - ignora
        console.warn("Falha ao guardar localização no cache.");
    }
};

// ====================================================================
// FUNÇÕES AUXILIARES
// ====================================================================
export const timestampToDate = (timestamp) => new Date(timestamp * 1000);

const getOpenMeteoIcon = (weatherCode) => {
    switch (weatherCode) {
        case 0: return 'fas fa-sun'; 
        case 1: 
        case 2: 
        case 3: 
            return 'fas fa-cloud-sun'; 
        case 51: 
        case 53: 
        case 55: 
        case 61: 
        case 63: 
        case 65: 
        case 80: 
        case 81: 
        case 82: 
            return 'fas fa-cloud-showers-heavy'; 
        case 71: 
        case 73: 
        case 75: 
        case 85: 
        case 86: 
            return 'fas fa-snowflake';
        case 95: 
        case 96: 
        case 99: 
            return 'fas fa-bolt';
        case 45: 
        case 48: 
            return 'fas fa-smog';
        default: return 'fas fa-cloud';
    }
};

export const getIconUrl = (weatherCode) => getOpenMeteoIcon(weatherCode);

export const getTempColor = (temp) => {
    if (temp > 25) return 'text-red-400';
    if (temp > 18) return 'text-yellow-400';
    if (temp > 10) return 'text-blue-400';
    return 'text-indigo-400';
};

// SIMPLIFICAÇÃO DA CIDADE
const simplifyCityName = (rawName) => {
    if (!rawName) return null;

    let cityName = rawName.split(',')[0].trim();

    cityName = cityName.replace(/freguesia de|parish of/gi, '').trim();

    if (cityName.split(' ').length > 4) {
        cityName = cityName.split(' ').slice(0, 3).join(' ');
    }
    return cityName;
};

// ====================================================================
// HOOK: useLocationData
// ====================================================================
export function useLocationData() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState({ city: "Portugal", lat: 38.7223, lon: -9.1393, isFallback: true });

    const getGeolocation = useCallback(() => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                return resolve({ lat: 38.7223, lon: -9.1393, fallback: true, error: "Geolocalização não é suportada." });
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, fallback: false }),
                (err) => resolve({ lat: 38.7223, lon: -9.1393, fallback: true, error: err.message || "Permissão de localização negada." }),
                { timeout: 15000, enableHighAccuracy: true } 
            );
        });
    }, []);

    const getCityName = useCallback(async (lat, lon) => {
        if (!LOCATIONIQ_API_KEY) {
            console.warn("Chave LocationIQ ausente. Usando 'Porto' como nome mock.");
            return "Porto";
        }

        const url = `${LOCATIONIQ_URL}?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

        const res = await fetch(url);
        if (res.status === 429) throw new Error("LocationIQ: Rate Limit atingido.");
        if (!res.ok) throw new Error(`Erro HTTP LocationIQ: ${res.status}`);

        const data = await res.json();
        if (data.address) {
            const address = data.address;

            const rawCityName =
                address.city ||
                address.town ||
                address.village ||
                address.suburb ||
                address.city_district ||
                address.county;

            const cityName = simplifyCityName(rawCityName);

            return cityName || address.country || "Localização desconhecida";
        }

        return "Localização desconhecida";
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const cached = getCachedLocation();
            if (cached) {
                setLocation(cached);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            const coords = await getGeolocation();
            if (coords.error) setError(coords.error);

            try {
                const cityName = await getCityName(coords.lat, coords.lon);

                const newLocation = {
                    city: cityName,
                    lat: coords.lat,
                    lon: coords.lon,
                    isFallback: coords.fallback,
                };

                setCachedLocation(newLocation);
                setLocation(newLocation);

            } catch (err) {
                setError(err.message);
                const fallbackLocation = { city: "Portugal", lat: coords.lat, lon: coords.lon, isFallback: true };
                setCachedLocation(fallbackLocation);
                setLocation(fallbackLocation);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [getGeolocation, getCityName]);

    return { location, loading, error };
}

// ====================================================================
// HOOK: useWeatherForecast
// ====================================================================
export function useWeatherForecast(lat, lon) {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWeather = useCallback(async (latitude, longitude) => {
        if (!latitude || !longitude) {
            setForecast(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
            const res = await fetch(url);

            if (!res.ok) {
                throw new Error(`Erro HTTP Open-Meteo: ${res.status}`);
            }

            const data = await res.json();

            if (!data.daily || data.daily.time.length === 0) {
                throw new Error("API devolveu dados diários incompletos.");
            }

            const processedDaily = data.daily.time.map((timestamp, index) => ({
                dt: new Date(timestamp).getTime() / 1000,
                temp: {
                    day: data.current ? Math.round(data.current.temperature_2m) : Math.round(data.daily.temperature_2m_max[index]),
                    min: Math.round(data.daily.temperature_2m_min[index]),
                    max: Math.round(data.daily.temperature_2m_max[index]),
                },
                weather: [{
                    icon: data.daily.weather_code[index],
                }],
            }));

            const currentData = processedDaily[0];

            setForecast({
                current: {
                    temp: currentData.temp.day,
                    description: "Previsão do dia",
                    icon: currentData.weather[0].icon,
                },
                daily: processedDaily
            });

        } catch (err) {
            console.error("Erro ao obter previsão:", err);
            setError(err.message || "Erro inesperado ao carregar previsão.");
            setForecast(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (lat && lon) fetchWeather(lat, lon);
    }, [lat, lon, fetchWeather]);

    return { forecast, loading, error };
}
