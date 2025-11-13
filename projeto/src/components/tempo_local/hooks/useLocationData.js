// src/hooks/useLocationData.js
import { useState, useEffect } from "react";

export const useLocationData = () => {
  const location = { city: "Lisboa, Portugal", lat: 38.72, lon: -9.13 };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return { location, loading, error: null };
};
