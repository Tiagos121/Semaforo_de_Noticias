// src/hooks/useWeatherForecast.js
import { useState, useEffect } from "react";

const MOCK_FORECAST = {
  current: {
    temp: 16.5,
    icon: "04d",
    description: "céu parcialmente nublado",
    dt: Date.now() / 1000,
  },
  daily: Array.from({ length: 7 }, (_, i) => ({
    dt: (Date.now() / 1000) + 86400 * i,
    temp: { min: 10 + i, max: 14 + i },
    weather: [{ icon: i % 2 ? "04d" : "10d", description: "nublado" }],
  })),
};

export const useWeatherForecast = (lat, lon) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lat && lon) {
      const timer = setTimeout(() => {
        setForecast(MOCK_FORECAST);
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lat, lon]);

  return { forecast, loading, error: null };
};
