// src/components/tempo_local/DisplayLocalizacao.jsx
import React from "react";
import {
  useLocationData,
  useWeatherForecast,
  timestampToDate,
  getIconUrl,
} from "../../hooks/useWeatherAndLocation";

// Importar o nosso novo ficheiro CSS (mantém o teu estilo original)
import "./DisplayLocalizacaoStyles.css";

// Componente de Ícone (Font Awesome)
const MapPinIcon = ({ className }) => (
  <i className={`fas fa-map-marker-alt ${className}`}></i>
);

// ====================================================================
// COMPONENTE: Localização + Meteorologia Atual + Previsão Semanal
// - Suporta 2 modos:
//   1) Autónomo: sem prop "location" -> usa useLocationData() internamente (modo Home)
//   2) Controlado: recebe prop "location" -> usa essa location e não corre o hook interno (modo NoticiasLocais)
// ====================================================================
export default function DisplayLocalizacao({ location: externalLocation }) {
  // Hook interno (usado apenas se não houver externalLocation)
  const internal = useLocationData();

  // Decide qual location usar (prop ganha prioridade)
  const location = externalLocation || internal.location;

  // Se recebemos externalLocation, não consideramos o loading/error do internal hook
  const locationLoading = externalLocation ? false : internal.loading;
  const locationError = externalLocation ? null : internal.error;

  // Chama o hook de previsão meteorológica com as coords (em ambos os modos)
  // O hook original deve lidar com lat/lon válidos; o internal tem fallback para Portugal
  const {
    forecast,
    loading: weatherLoading,
    error: weatherError,
  } = useWeatherForecast(location.lat, location.lon);

  const totalLoading = locationLoading || weatherLoading;
  const currentCity = location.city || "Localização atual";

  // --- Ecrã de Loading ---
  if (totalLoading)
    return (
      <div className="weather-widget-loading-screen weather-widget-font">
        <p className="weather-widget-loading-text">
          A carregar localização e meteorologia...
        </p>
      </div>
    );

  // --- Ecrã de Erro ---
  if (locationError || weatherError)
    return (
      <div className="weather-widget-error-screen weather-widget-font">
        <div className="weather-widget-error-card">
          <h1 className="weather-widget-error-title">Erro de Carregamento</h1>
          <p>{locationError || weatherError}</p>
          <p className="weather-widget-error-hint">
            Verifique a permissão de geolocalização e as chaves de API.
          </p>
        </div>
      </div>
    );

  // --- Ecrã Principal (Layout com CSS) ---
  return (
    <div className="weather-widget-container weather-widget-font">
      {/* Título Principal */}
      <div className="weather-widget-header">
        <h1 className="weather-widget-title">Localização</h1>
        <p className="weather-widget-location">
          <MapPinIcon className="weather-widget-location-icon" />
          {currentCity}
        </p>
      </div>

      {/* Container de conteúdo principal (Cartão) */}
      <div className="weather-widget-card">
        {/* Meteorologia Atual (Centralizada) */}
        {forecast?.current ? (
          <div className="weather-widget-current">
            {/* Ícone e Temperatura Atual */}
            <div className="weather-widget-current-main">
              <i
                className={`${getIconUrl(
                  forecast.current.icon
                )} weather-widget-current-icon`}
              ></i>
              <p className="weather-widget-current-temp">
                {forecast.current.temp}°C
              </p>
            </div>

            {/* Descrição e Data */}
            <div className="weather-widget-current-details">
              <p className="weather-widget-current-desc">
                {forecast.current.description}
              </p>
              <p className="weather-widget-current-date">
                {timestampToDate(Date.now() / 1000).toLocaleDateString("pt-PT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        ) : (
          <p className="weather-widget-no-data">
            Sem dados meteorológicos disponíveis.
          </p>
        )}

        {/* Previsão Semanal - Grelha de Cards */}
        {forecast?.daily ? (
          <div className="weather-widget-forecast-wrapper">
            <div className="weather-widget-forecast-grid">
              {forecast.daily.map((day, index) => (
                <div key={day.dt} className="weather-widget-forecast-day">
                  {/* Nome do Dia */}
                  <p className="weather-widget-forecast-day-name">
                    {index === 0
                      ? "Hoje"
                      : timestampToDate(day.dt)
                          .toLocaleDateString("en-US", {
                            weekday: "long",
                          })
                          .slice(0, 3)}
                  </p>

                  {/* Ícone */}
                  <i
                    className={`${getIconUrl(
                      day.weather[0].icon
                    )} weather-widget-forecast-day-icon`}
                  ></i>

                  {/* Temperaturas Máxima | Mínima */}
                  <p className="weather-widget-forecast-day-temps">
                    {Math.round(day.temp.min)}° | {Math.round(day.temp.max)}°
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="weather-widget-no-forecast">
            Sem previsão semanal disponível.
          </p>
        )}
      </div>
    </div>
  );
}
