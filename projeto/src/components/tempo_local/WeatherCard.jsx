// src/components/Weather/WeatherCard.jsx
import React from "react";
import COLORS from "./tempo/utils/colors";
import { getIconUrl } from "./tempo/utils/getIconUrl";
import { timestampToDate } from "./tempo/utils/timestampToDate";

export default function WeatherCard({ day, index }) {
  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: COLORS.BACKGROUND,
        color: COLORS.TEXT_LIGHT,
        borderRadius: "0.5rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        border: "1px solid #475569",
      }}
    >
      <p style={{ fontSize: "0.875rem", color: COLORS.TEXT_MUTED, marginBottom: "0.5rem" }}>
        {index === 0
          ? "Hoje"
          : timestampToDate(day.dt).toLocaleDateString("pt-PT", { weekday: "short" })}
      </p>
      <p style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>
        {getIconUrl(day.weather[0].icon)}
      </p>
      <p style={{ fontSize: "0.875rem", fontWeight: "600" }}>
        {Math.round(day.temp.min)}° | {Math.round(day.temp.max)}°
      </p>
    </div>
  );
}
