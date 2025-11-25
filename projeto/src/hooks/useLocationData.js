// src/hooks/useLocationData.js
import { useState, useEffect } from "react";

const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
const REVERSE_URL = "https://us1.locationiq.com/v1/reverse.php";
const SEARCH_URL = "https://us1.locationiq.com/v1/search.php";

/**
 * useLocationData
 * Retorna: { location, loading, error }
 * location inclui: city, town, village, suburb, county, state, lat, lon, nearbyCity, isFallback
 */
export function useLocationData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState({
    city: "Portugal",
    town: null,
    village: null,
    suburb: null,
    county: null,
    state: null,
    lat: 38.7223,
    lon: -9.1393,
    nearbyCity: null,
    isFallback: true, // Adicionado para saber se é o default
  });

  // Pega coords do browser (fallback Lisboa)
  function getBrowserCoords() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        // Fallback Lisboa (coordenadas de Portugal)
        return resolve({ lat: 38.7223, lon: -9.1393, fallback: true });
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            fallback: false,
          }),
        () => resolve({ lat: 38.7223, lon: -9.1393, fallback: true }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  // Reverse geocode => extrai address
  async function reverseGeocode(lat, lon) {
    if (!LOCATIONIQ_API_KEY) {
      console.warn("LocationIQ key missing -> fallback Portugal");
      return { address: {}, display_name: "Portugal" };
    }

    const url = `${REVERSE_URL}?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn("LocationIQ rate limit (429). Using fallback.");
        return { address: {}, display_name: "Portugal", rateLimited: true };
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
      return { address: {}, display_name: "Portugal" };
    }
  }

  // Optional: search nearby city by coords (only call if reverse gives poor granularity)
  async function searchNearbyCity(lat, lon) {
    if (!LOCATIONIQ_API_KEY) return null;
    // Query com precisão de latitude e longitude
    const q = `${lat.toFixed(4)},${lon.toFixed(4)}`; 
    const url = `${SEARCH_URL}?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(q)}&format=json&limit=10&addressdetails=1`;
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn("LocationIQ search rate limited.");
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      // Priorizar resultados com city/town/village
      for (const item of data) {
        const addr = item.address || {};
        if (addr.city || addr.town || addr.village) {
          return addr.city || addr.town || addr.village;
        }
      }
      // fallback to first display_name, cortando após a primeira vírgula (mais limpo)
      return data[0].display_name?.split(",")[0]?.trim() || null;
    } catch (err) {
      console.warn("Nearby search failed:", err);
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);

      const coords = await getBrowserCoords();
      const lat = coords.lat;
      const lon = coords.lon;
      const isInitialFallback = coords.fallback;

      // 1. Reverse geocode
      const rev = await reverseGeocode(lat, lon);
      const addr = rev.address || {};

      // 2. Extrai campos
      const village = addr.village || null;
      const town = addr.town || null;
      const suburb = addr.suburb || null;
      const county = addr.county || addr.municipality || null;
      const state = addr.state || addr.state_district || null;
      
      // Prioridade para um nome de localidade robusto (evitando suburb como principal)
      let primaryLocationName = addr.city || addr.town || addr.village || null;

      // 3. nearbyCity: só pesquisa se não tivermos um nome primário robusto
      let nearbyCity = null;
      if (!primaryLocationName) {
        nearbyCity = await searchNearbyCity(lat, lon);
        // Se encontrarmos, usamos como o nome principal, mas mantemos em 'nearbyCity' também.
        if (nearbyCity) {
            primaryLocationName = nearbyCity;
        }
      }

      // 4. Determina o nome final da "cidade"
      const finalCityName = primaryLocationName || county || state || "Portugal";

      // 5. Trata o erro de Rate Limit
      if (rev.rateLimited) {
        if (mounted) {
          setError("Limite LocationIQ atingido. A mostrar notícias nacionais.");
          setLocation({
            city: "Portugal",
            town: null,
            village: null,
            suburb: null,
            county: null,
            state: null,
            lat,
            lon,
            nearbyCity: null,
            isFallback: true,
          });
          setLoading(false);
          return;
        }
      }
      
      // 6. Atualiza o estado
      if (mounted) {
        setLocation({
          city: finalCityName, // O nome principal a mostrar no frontend
          town,
          village,
          suburb,
          county,
          state,
          lat,
          lon,
          nearbyCity,
          isFallback: isInitialFallback && finalCityName === "Portugal",
        });
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { location, loading, error };
}