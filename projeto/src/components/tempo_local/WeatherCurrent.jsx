// src/components/Weather/WeatherCurrent.jsx
import React from "react";
import COLORS from "./tempo/utils/colors";
import { getIconUrl } from "./tempo/utils/getIconUrl";
import { timestampToDate } from "./tempo/utils/timestampToDate";

export default function WeatherCurrent({ current }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "2.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginRight: "2rem" }}>
        <p style={{ fontSize: "4rem", width: "5rem", height: "5rem", lineHeight: 1 }}>
          {getIconUrl(current.icon)}
        </p>
        <p style={{ fontSize: "3rem", fontWeight: "bold", color: COLORS.TEXT_LIGHT, marginLeft: "1rem" }}>
          {current.temp}°C
        </p>
      </div>
      <div style={{ textAlign: "left", color: COLORS.TEXT_MUTED }}>
        <p style={{ fontSize: "1.125rem", textTransform: "capitalize" }}>
          {current.description}
        </p>
        <p style={{ fontSize: "0.875rem" }}>
          {timestampToDate(current.dt).toLocaleDateString("pt-PT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>
    </div>
  );
}
