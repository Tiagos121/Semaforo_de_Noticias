import { useEffect, useState } from "react";
import "../../src/index.css";

export default function TesteMeteo() {
  const [data, setData] = useState(null);

  useEffect(() => {
  const fetchMeteo = async () => {
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=38.72&longitude=-9.13&current_weather=true");
      if (!res.ok) throw new Error("Erro ao buscar meteorologia");
      const json = await res.json();
      setData(json.current_weather);
    } catch (err) {
      console.error("❌ Erro:", err);
    }
  };

  fetchMeteo();
}, []);

  if (!data) return <p>A carregar...</p>;

  return (
    <div className="card">
      <h2>🌤️ Meteorologia</h2>
      <p>Lisboa</p>
      <h3>{data.temperature}°C</h3>
      <p>Vento: {data.windspeed} km/h</p>
    </div>
  );
}
