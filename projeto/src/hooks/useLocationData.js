import { useState, useEffect, useCallback } from 'react';

// --- CONFIGURAÇÃO DE CHAVES ---
const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || "YOUR_LOCATIONIQ_KEY";
const LOCATIONIQ_URL = "https://us1.locationiq.com/v1/reverse.php"; 

/**
 * Custom Hook para obter a localização geográfica do utilizador e traduzir
 * as coordenadas (Lat/Long) para um nome de cidade usando LocationIQ Geocoding.
 * * @returns {object} { location: {city, lat, lon}, loading, error }
 */
export function useLocationData() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState({ 
        city: "Portugal", // Valor predefinido para pesquisa nacional
        lat: null, 
        lon: null 
    });

    // --- 1. FUNÇÃO PARA OBTER COORDENADAS DO NAVEGADOR (Com Fallback Limpo) ---
    const getGeolocation = useCallback(() => {
        return new Promise((resolve) => { // NÃO HÁ REJEIÇÃO, SEMPRE RESOLVE COM DADOS OU FALLBACK
            if (!navigator.geolocation) {
                console.warn("Geolocalização não suportada. Usando fallback.");
                resolve({ city: "Portugal", lat: 38.7223, lon: -9.1393, isFallback: true });
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                // Sucesso: Devolve Lat/Long reais
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                
                // Erro/Negação: Devolve erro mas resolve com Lat/Long de Fallback
                (err) => {
                    console.warn(`Localização negada ou falhou (${err.code}). Usando fallback.`);
                    resolve({ city: "Portugal", lat: 38.7223, lon: -9.1393, isFallback: true, errorMessage: "Permissão de localização negada." });
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    }, []);

    // --- 2. FUNÇÃO PARA CONVERTER COORDENADAS EM NOME DA CIDADE (LocationIQ Geocoding) ---
    const getCityName = useCallback(async (lat, lon, isFallback) => {
        // Se for fallback, não chamamos a API
        if (isFallback) {
             return "Portugal";
        }
        
        const apiKey = LOCATIONIQ_API_KEY;
        if (apiKey === "YOUR_LOCATIONIQ_KEY" || !apiKey || apiKey.startsWith("YOUR")) {
             console.warn("Chave LocationIQ em falta. Usando 'Portugal (Mock)' como fallback.");
             // Simulação mock
             if (lat > 40) return "Porto (Mock)";
             if (lat < 39) return "Lisboa (Mock)";
             return "Aveiro (Mock)";
        }
        const url = `${LOCATIONIQ_URL}?key=${apiKey}&lat=${lat}&lon=${lon}&format=json`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`LocationIQ HTTP error! Status: ${res.status}`);
            const data = await res.json();
            
            // Lógica para extrair o nome da cidade
            if (data.address) {
                const address = data.address;
                return address.city || address.county || address.village || address.state || data.display_name.split(',')[0] || "Portugal";
            }
            return "Portugal"; 
        } catch (e) {
            console.error("Erro no LocationIQ:", e);
            return "Portugal"; 
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            // A Promise sempre resolve
            const coords = await getGeolocation(); 

            if (coords.isFallback) {
                // Se o navegador negou (Fallback)
                setError(coords.errorMessage || "Localização Padrão.");
                setLocation({ city: "Portugal", lat: 38.7223, lon: -9.1393 });
            } else {
                // Se obteve coordenadas, tenta Geocoding real
                const cityName = await getCityName(coords.lat, coords.lon, false);
                setLocation({ city: cityName, lat: coords.lat, lon: coords.lon });
            }
            
            setLoading(false);
        };
        fetchData();
    }, [getGeolocation, getCityName]);

    return { location, loading, error };
}