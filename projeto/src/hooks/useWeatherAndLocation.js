import React, { useState, useEffect, useCallback } from 'react';

// ====================================================================
// CONFIGURAÇÃO E CHAVES DE API
// ====================================================================
// Nota: getEnvKey é usado para buscar as chaves do ambiente Vite, mas o Open-Meteo não as requer.
const getEnvKey = (keyName, fallbackValue) => import.meta.env[keyName] || fallbackValue;

const LOCATIONIQ_API_KEY = getEnvKey('VITE_LOCATIONIQ_API_KEY', '');
const LOCATIONIQ_URL = "https://us1.locationiq.com/v1/reverse.php";

// OPEN-METEO é GRATUITO e não requer chave.
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// ====================================================================
// FUNÇÕES AUXILIARES
// ====================================================================
export const timestampToDate = (timestamp) => new Date(timestamp * 1000);

// Mapeia o código de tempo da Open-Meteo (WMO) para classes Font Awesome
const getOpenMeteoIcon = (weatherCode) => {
    // Referência: https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM
    // Usamos ícones FA que correspondem ao clima
    switch (weatherCode) {
        // Céu Limpo / Sol
        case 0: return 'fas fa-sun'; 
        // Parcialmente Nublado
        case 1: // Predominantly clear
        case 2: // Partly cloudy
        case 3: // Overcast
            return 'fas fa-cloud-sun'; 
        // Chuva / Aguaceiros
        case 51: // Drizzle, light
        case 53: // Drizzle, moderate
        case 55: // Drizzle, dense
        case 61: // Rain, slight
        case 63: // Rain, moderate
        case 65: // Rain, heavy
        case 80: // Rain showers, slight
        case 81: // Rain showers, moderate
        case 82: // Rain showers, violent
            return 'fas fa-cloud-showers-heavy'; 
        // Neve
        case 71: // Snow fall, slight
        case 73: // Snow fall, moderate
        case 75: // Snow fall, heavy
        case 85: // Snow showers, slight
        case 86: // Snow showers, heavy
            return 'fas fa-snowflake';
        // Tempestades
        case 95: // Thunderstorm, slight or moderate
        case 96: // Thunderstorm with hail, slight
        case 99: // Thunderstorm with hail, heavy
            return 'fas fa-bolt';
        // Névoa / Neblina
        case 45: // Fog
        case 48: // Depositing rime fog
            return 'fas fa-smog';
        // Padrão (Nublado)
        default: return 'fas fa-cloud';
    }
};

// Funções de URL de Ícone e Cor Temp agora usam a lógica Open-Meteo/Font Awesome
export const getIconUrl = (weatherCode) => getOpenMeteoIcon(weatherCode);

export const getTempColor = (temp) => {
    if (temp > 25) return 'text-red-400';
    if (temp > 18) return 'text-yellow-400';
    if (temp > 10) return 'text-blue-400';
    return 'text-indigo-400';
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
            // Aumenta o timeout e a precisão para um resultado mais rápido
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                (err) => reject(new Error(err.message || "Permissão de localização negada.")),
                { timeout: 15000, enableHighAccuracy: true } 
            );
        });
    }, []);

    const getCityName = useCallback(async (lat, lon) => {
        if (!LOCATIONIQ_API_KEY) {
             // MOCK data se a chave LocationIQ estiver em falta.
             console.warn("Chave LocationIQ em falta. Usando 'Porto' como cidade mock.");
             return "Porto";
        }

        const url = `${LOCATIONIQ_URL}?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro HTTP LocationIQ: ${res.status}`);

        const data = await res.json();
        if (data.address) {
            const address = data.address;

            const cityName = [
                address.city ||
                address.town ||
                address.village ||
                address.suburb ||
                address.city_district,
                address.county
            ].filter(Boolean).join(', ');

            return cityName || "Localização desconhecida";
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
// HOOK PARA PREVISÃO DO TEMPO (Open-Meteo)
// ====================================================================
export function useWeatherForecast(lat, lon) {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWeather = useCallback(async (latitude, longitude) => {
        if (!latitude || !longitude) {
            setError(null);
            setForecast(null);
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            // URL da Open-Meteo: pedimos código do tempo, máx e mín
            const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
            const res = await fetch(url);
            
            if (!res.ok) {
                throw new Error(`Erro HTTP Open-Meteo: ${res.status}`);
            }

            const data = await res.json();
            
            // Verifica se o objeto daily existe e tem dados
            if (!data.daily || data.daily.time.length === 0) {
                 throw new Error("Resposta da API incompleta. Sem dados diários.");
            }

            // Mapeamento dos dados da Open-Meteo para a estrutura esperada pelo DisplayLocalizacao
            const processedDaily = data.daily.time.map((timestamp, index) => ({
                dt: new Date(timestamp).getTime() / 1000, // Converter timestamp para o formato esperado
                temp: {
                    day: data.current ? Math.round(data.current.temperature_2m) : Math.round(data.daily.temperature_2m_max[index]), // Usar MAX se current não estiver disponível
                    min: Math.round(data.daily.temperature_2m_min[index]),
                    max: Math.round(data.daily.temperature_2m_max[index]),
                },
                weather: [{
                    icon: data.daily.weather_code[index], // Passamos o código WMO para a função getIconUrl
                }],
            }));

            // Usamos o primeiro dia da previsão diária como o "atual"
            const currentData = processedDaily[0];

            setForecast({
                current: {
                    temp: currentData.temp.day,
                    description: "Previsão do dia", // Open-Meteo não dá descrição textual fácil
                    icon: currentData.weather[0].icon,
                },
                daily: processedDaily
            });

        } catch (err) {
            console.error("Erro ao obter previsão:", err);
            setError(err.message || "Não foi possível carregar a previsão do tempo.");
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

