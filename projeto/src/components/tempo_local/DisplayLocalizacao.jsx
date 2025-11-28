// src/components/tempo_local/DisplayLocalizacao.jsx
import React, { useState, useEffect } from "react";
import UnifiedNewsFetcher from "../UnifiedNewsFetcher";
import {
  useLocationData,
  useWeatherForecast,
  timestampToDate,
  getIconUrl,
} from "../../hooks/useWeatherAndLocation"; 

import "./DisplayLocalizacaoStyles.css";

const MapPinIcon = ({ className }) => (
  <i className={`fas fa-map-marker-alt ${className}`}></i>
);

// ====================================================================
// COMPONENTE: Localização + Meteorologia
// ====================================================================
export default function DisplayLocalizacao({ location: externalLocation }) {
  
  // 1. Otimização: Chama o hook incondicionalmente, mas a otimização de API está no hook.
  const internalResult = useLocationData();
  
  // 2. Determinação do Estado Final
  const location = externalLocation || internalResult.location;
  const locationLoading = externalLocation ? false : internalResult.loading;
  const locationError = externalLocation ? null : internalResult.error;

  // 3. Chamada ao Hook de Meteorologia (Acesso Seguro)
  const { forecast, loading: weatherLoading, error: weatherError } = useWeatherForecast(
    location?.lat,
    location?.lon
  );

  const totalLoading = locationLoading || weatherLoading;
  const currentCity = location?.city || "Localização atual";

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
    
  // --- Ecrã Principal (Layout Original) ---
  return (
    <div className="weather-widget-container weather-widget-font">
      {/* Título Principal */}
      <div className="weather-widget-header">
        <h1 className="weather-widget-title">Localização</h1>
        <p className="weather-widget-location">
          <MapPinIcon className="weather-widget-location-icon" />
          {currentCity}
          {location?.isFallback && <span className="weather-widget-fallback-tag"> (Nacional)</span>}
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

        {/* --- Seção de Notícias --- */}
        <div className="weather-widget-news">
          <h2 className="weather-widget-news-title">Notícias</h2>
          <div className="weather-widget-news-content">
            <NewsSection locationData={location} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// COMPONENTE: Seção de Notícias (Fallback com UnifiedNewsFetcher)
// ====================================================================
function NewsSection({ locationData }) {
  const [searchLevel, setSearchLevel] = useState(0); // nível atual do fallback
  const [currentTerm, setCurrentTerm] = useState("");
  const [lastUsedLevel, setLastUsedLevel] = useState(""); // para mostrar "Resultados de: ..."

  // Definir a ordem de fallback
  const levels = [
    { key: "freguesia", name: locationData.freguesia },
    { key: "concelho", name: locationData.concelho },
    { key: "distrito", name: locationData.distrito },
    { key: "area_metropolitana", name: locationData.area_metropolitana },
    { key: "pais", name: locationData.pais },
  ].filter((l) => l.name);

  useEffect(() => {
    if (levels.length > 0) {
      setCurrentTerm(levels[0].name);
      setSearchLevel(0);
      setLastUsedLevel(levels[0].key);
    }
  }, [locationData, levels]);

  const handleRender = (feed, loading, error) => {
    if (loading) return <p>Carregando notícias...</p>;
    if (error) return <p>Erro: {error}</p>;

    // Se não houver notícias e ainda houver níveis acima
    if ((!feed || feed.length === 0) && searchLevel < levels.length - 1) {
      const nextLevel = searchLevel + 1;
      setSearchLevel(nextLevel);
      setCurrentTerm(levels[nextLevel].name);
      setLastUsedLevel(levels[nextLevel].key);
      return <p>Procurando notícias mais gerais...</p>;
    }

    if (!feed || feed.length === 0) {
      return (
        <p>
          Nenhuma notícia encontrada. Tente ser mais genérico na sua pesquisa.
        </p>
      );
    }

    // Notícias encontradas
    return (
      <div>
        <p>
          Resultados de:{" "}
          <strong>
            {lastUsedLevel === "freguesia"
              ? locationData.freguesia
              : lastUsedLevel === "concelho"
              ? locationData.concelho
              : lastUsedLevel === "distrito"
              ? locationData.distrito
              : lastUsedLevel === "area_metropolitana"
              ? locationData.area_metropolitana
              : locationData.pais}
          </strong>
        </p>
        <div className="news-grid">
          {feed.map((art) => (
            <div key={art.id} className="news-card">
              <img src={art.image} alt={art.title} />
              <h3>{art.title}</h3>
              <p>{art.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!currentTerm) return <p>Carregando localização...</p>;

  return (
    <UnifiedNewsFetcher
      searchTerm={currentTerm}
      render={(feed, loading, error) => handleRender(feed, loading, error)}
    />
  );
}