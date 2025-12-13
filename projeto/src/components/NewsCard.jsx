import React, { useContext, useEffect, useState } from "react";
import "../styles/cards.css";
import { AuthContext } from "../context/AuthContextValue";
import BiasSpectrum from "./BiasSpectrum";
import BiasAnalyzer from "./BiasAnalyzer";
import defaultImage from "../assets/fundo_sn.png";

// 🔄 NewsCard RECEBE as funções de estado e toggle dos pais
export default function NewsCard({ noticia, isFavorito, toggleFavorito, updateFeedBias }) {
  const { user } = useContext(AuthContext);

  // Estado local para detalhes/viés da notícia
  const [detalhes, setDetalhes] = useState(noticia.detalhes || noticia.vies || {});

  const scores = detalhes?.scores_ideologicos || [];
  const favorito = isFavorito(noticia.url);

  const handleToggle = () => toggleFavorito(noticia);

  // Atualiza detalhes local e no feed global quando a análise termina
  const handleAnalysisComplete = (result) => {
    setDetalhes(result);
    if (updateFeedBias) updateFeedBias(noticia.id, result);
  };

  // Mantém detalhes atualizados se a prop mudar
  useEffect(() => {
    if (noticia.detalhes || noticia.vies) {
      setDetalhes(noticia.detalhes || noticia.vies);
    }
  }, [noticia.detalhes, noticia.vies]);

  return (
    <div className="news-card">
      {/* Imagem */}
      <div style={{ marginBottom: 10 }}>
        <img
          src={noticia.image || defaultImage}
          alt={noticia.title}
          style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }}
        />
      </div>

      {/* Título + Descrição */}
      <div style={{ flex: 1 }}>
        <h2 className="news-title">
          <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="news-link">
            {noticia.title}
          </a>
        </h2>
        <p className="news-desc">{noticia.description}</p>
        <p style={{ marginTop: 8, fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          Fonte: {noticia.source?.name || "Desconhecida"}
        </p>
      </div>

      {/* Spectro de viés ou análise */}
      {scores.length > 0 ? (
        <BiasSpectrum scores={scores} opinativo={detalhes.opinativo || 0} />
      ) : (
        <BiasAnalyzer
          titulo={noticia.title}
          description={noticia.description}
          existingDetails={detalhes}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {/* Botão de Favorito */}
      {user && (
        <div
          className="favorito-button-container"
          style={{ textAlign: "center", paddingTop: 10, marginTop: 10, borderTop: "1px solid #f3f4f6" }}
        >
          <button
            onClick={handleToggle}
            title={favorito ? "Remover favorito" : "Guardar favorito"}
            className={`favorite-toggle-btn ${favorito ? "is-favorito" : ""}`}
          >
            <span role="img" aria-label="favorito">{favorito ? "★" : "☆"}</span>
            {favorito ? " Guardado" : " Guardar"}
          </button>
        </div>
      )}

      {/* Link para ver notícia */}
      <div style={{ marginTop: 15, textAlign: "center" }}>
        <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="news-full-link">
          <i className="fas fa-info-circle"></i> Ler notícia completa
        </a>
      </div>
    </div>
  );
}