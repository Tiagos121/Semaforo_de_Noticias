// src/components/Weather/WeatherForecast.jsx
import React from "react";
import WeatherCard from "./WeatherCard";

export default function WeatherForecast({ forecast }) {
  return (
    <div style={{ marginTop: "2rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: "1rem",
        }}
      >
        {forecast.daily.map((day, index) => (
          <WeatherCard key={day.dt} day={day} index={index} />
        ))}
      </div>
    </div>
  );
}
