import React, { useState, useEffect, useCallback } from 'react';

// ====================================================================
// CONFIGURAÇÃO E CHAVES DE API
// ====================================================================
const getEnvKey = (keyName, fallbackValue) => import.meta.env[keyName] || fallbackValue;

const LOCATIONIQ_API_KEY = getEnvKey('VITE_LOCATIONIQ_API_KEY', '');
const LOCATIONIQ_URL = "https://us1.locationiq.com/v1/reverse.php";

const OPENWEATHER_API_KEY = getEnvKey('VITE_OPENWEATHER_API_KEY', '');
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/onecall";

// ====================================================================
// FUNÇÕES AUXILIARES
// ====================================================================
export const timestampToDate = (timestamp) => new Date(timestamp * 1000);
export const getIconUrl = (iconCode) => `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

export const getTempColor = (temp) => {
    if (temp > 25) return 'text-red-500';
    if (temp > 18) return 'text-yellow-500';
    if (temp > 10) return 'text-blue-500';
    return 'text-indigo-500';
};

// ====================================================================
// HOOK PARA LOCALIZAÇÃO (Latitude, Longitude e Cidade)
// ====================================================================
export function useLocationData() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState({ city: "Desconhecido", lat: null, lon: null });

    const getGeolocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocalização não é suportada neste navegador."));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                (err) => reject(new Error("Permissão de localização negada.")),
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    }, []);

    const getCityName = useCallback(async (lat, lon) => {
        if (!LOCATIONIQ_API_KEY) {
            throw new Error("A chave da API LocationIQ está em falta. Configure VITE_LOCATIONIQ_API_KEY.");
        }

        const url = `${LOCATIONIQ_URL}?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro HTTP LocationIQ: ${res.status}`);

        const data = await res.json();
        if (data.address) {
            const address = data.address;
            return (
                address.city ||
                address.town ||
                address.village ||
                address.county ||
                address.state ||
                "Localização desconhecida"
            );
        }
        return "Localização desconhecida";
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const coords = await getGeolocation();
                const cityName = await getCityName(coords.lat, coords.lon);
                setLocation({ city: cityName, lat: coords.lat, lon: coords.lon });
            } catch (err) {
                setError(err.message);
                setLocation({ city: "Localização indisponível", lat: null, lon: null });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [getGeolocation, getCityName]);

    return { location, loading, error };
}

// ====================================================================
// HOOK PARA PREVISÃO DO TEMPO (OpenWeather)
// ====================================================================
export function useWeatherForecast(lat, lon) {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWeather = useCallback(async (latitude, longitude) => {
        if (!latitude || !longitude) return;

        if (!OPENWEATHER_API_KEY) {
            setError("A chave da API OpenWeatherMap está em falta. Configure VITE_OPENWEATHER_API_KEY.");
            return;
        }

        setLoading(true);
        try {
            const url = `${OPENWEATHER_URL}?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly&units=metric&lang=pt&appid=${OPENWEATHER_API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Erro HTTP OpenWeather: ${res.status}`);

            const data = await res.json();
            setForecast({
                current: {
                    temp: Math.round(data.current.temp),
                    description: data.current.weather[0].description.charAt(0).toUpperCase() + data.current.weather[0].description.slice(1),
                    icon: data.current.weather[0].icon,
                },
                daily: data.daily.slice(0, 7)
            });
        } catch (err) {
            console.error("Erro ao obter previsão:", err);
            setError("Não foi possível carregar a previsão do tempo.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (lat && lon) fetchWeather(lat, lon);
    }, [lat, lon, fetchWeather]);

    return { forecast, loading, error };
}
