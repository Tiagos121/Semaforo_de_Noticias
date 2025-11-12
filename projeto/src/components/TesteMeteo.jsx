import React, { useState, useEffect, useCallback } from 'react';

// --- CHAVES DE API (Assegurando que as chaves são lidas corretamente) ---
// Estas constantes devem ser lidas pelo seu ambiente Vite.
const OPENCAGE_API_KEY = import.meta.env.VITE_OPENCAGE_API_KEY || "YOUR_OPENCAGE_KEY";
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "YOUR_OPENWEATHER_KEY";

const OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json";
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

export default function LocalWeatherApp() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState(null); // {lat, lon, city}
    const [weather, setWeather] = useState(null); // {temp, description, icon}

    // --- 1. FUNÇÃO PARA OBTER COORDENADAS DO NAVEGADOR ---
    const getGeolocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                // Se não houver suporte, falhamos e usamos localização padrão
                reject(new Error("Geolocalização não é suportada por este navegador."));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                (err) => {
                    // Erro de permissão ou timeout
                    console.error("Erro ao obter localização do navegador:", err);
                    reject(new Error("Não foi possível obter a sua localização. Por favor, ative a geolocalização."));
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    }, []);

    // --- 2. FUNÇÃO PARA CONVERTER COORDENADAS EM NOME DA CIDADE (OpenCage Geocoding) ---
    const getCityName = useCallback(async (lat, lon) => {
        if (OPENCAGE_API_KEY === "YOUR_OPENCAGE_KEY") {
             console.warn("Chave OpenCage em falta. Usando 'Porto' como cidade mock.");
             return "Porto";
        }

        const url = `${OPENCAGE_URL}?q=${lat}+${lon}&key=${OPENCAGE_API_KEY}&language=pt&pretty=1`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`OpenCage HTTP error! Status: ${res.status}`);
            const data = await res.json();

            // Tenta extrair a cidade de vários níveis (city, town, village)
            const result = data.results[0];
            if (result) {
                const components = result.components;
                return components.city || components.town || components.village || components.state || result.formatted.split(',')[0] || "Localização Desconhecida";
            }
            return "Localização Desconhecida";

        } catch (e) {
            console.error("Erro no OpenCage Geocoding:", e);
            return "Localização Desconhecida"; // Fallback
        }
    }, []);

    // --- 3. FUNÇÃO PARA OBTER O TEMPO (OpenWeatherMap) ---
    const getWeather = useCallback(async (lat, lon) => {
        if (OPENWEATHER_API_KEY === "YOUR_OPENWEATHER_KEY") {
             console.warn("Chave OpenWeather em falta. Usando dados mock para o tempo.");
             return { temp: 18, description: "Céu Limpo (Mock)", icon: '01d' };
        }

        // units=metric para Celsius, lang=pt para Português
        const url = `${OPENWEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&lang=pt&appid=${OPENWEATHER_API_KEY}`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`OpenWeather HTTP error! Status: ${res.status}`);
            const data = await res.json();
            
            return {
                temp: Math.round(data.main.temp),
                description: data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1), // Capitaliza
                icon: data.weather[0].icon,
            };

        } catch (e) {
            console.error("Erro no OpenWeatherMap:", e);
            setError("Não foi possível carregar os dados de meteorologia.");
            return null;
        }
    }, []);


    // --- EFEITO PRINCIPAL (ORQUESTRAÇÃO) ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // 1. Obter Lat/Long
                const coords = await getGeolocation();

                // 2. Obter Nome da Cidade (OpenCage)
                const cityName = await getCityName(coords.lat, coords.lon);
                setLocation({ ...coords, city: cityName });

                // 3. Obter Tempo (OpenWeatherMap)
                const weatherData = await getWeather(coords.lat, coords.lon);
                setWeather(weatherData);

            } catch (err) {
                setError(err.message);
                setLocation({ city: "Localização Padrão" }); // Fallback na interface
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [getGeolocation, getCityName, getWeather]);

    // --- RENDERIZAÇÃO ---

    const getIconUrl = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;
    
    // Classes de cores baseadas na temperatura (para um toque visual)
    const tempColorClass = (temp) => {
        if (temp === null) return 'text-gray-600';
        if (temp > 25) return 'text-red-600';
        if (temp > 15) return 'text-yellow-600';
        return 'text-blue-600';
    };

    return (
        <div className="p-6 sm:p-10 bg-gradient-to-br from-indigo-50 to-purple-100 min-h-screen flex items-start justify-center font-inter">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 border-t-8 border-indigo-500">
                <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Localização & Meteo</h1>
                
                {loading && (
                    <div className="text-center p-8">
                        <svg className="animate-spin h-4 w-4 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-lg text-gray-600">A pedir a sua localização...</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl mb-6 shadow-md">
                        <p className="font-bold">Atenção!</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && location && (
                    <div className="space-y-6">
                        {/* Cartão de Localização */}
                        <div className="bg-gray-50 p-5 rounded-xl shadow-inner">
                            <h2 className="text-xl font-bold text-gray-700 mb-2 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                A sua localização
                            </h2>
                            <p className="text-3xl font-extrabold text-indigo-700">{location.city}</p>
                            {location.lat && location.lon && (
                                <p className="text-sm text-gray-500 mt-1">
                                    Coordenadas: Lat {location.lat.toFixed(4)}, Lon {location.lon.toFixed(4)}
                                </p>
                            )}
                        </div>

                        {/* Cartão de Meteorologia */}
                        <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 2a8 8 0 00-8 8c0 2.343.938 4.49 2.467 6.071l-.734.733a1 1 0 001.414 1.414L10 14.828l3.853 3.853a1 1 0 001.414-1.414l-.734-.733A8 8 0 0018 10a8 8 0 00-8-8zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                                </svg>
                                Meteorologia Atual
                            </h2>
                            {weather ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        {weather.icon && (
                                            <img src={getIconUrl(weather.icon)} alt={weather.description} className="w-16 h-16"/>
                                        )}
                                        <div>
                                            <p className={`text-5xl font-extrabold ${tempColorClass(weather.temp)}`}>
                                                {weather.temp}°C
                                            </p>
                                            <p className="text-md text-gray-600 mt-1">{weather.description}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400">Dados via OpenWeatherMap</p>
                                </div>
                            ) : (
                                <p className="text-gray-500">Dados do tempo não disponíveis.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}