// src/components/NewsCard.jsx

import React, { useContext } from "react";
import '../styles/cards.css'; // Importa os estilos de news-card
// Importar componentes e hooks necessários
import { AuthContext } from "../context/AuthContextValue"; // Para o estado de login (user)
import BiasSpectrum from "../components/BiasSpectrum"; // Componente BiasSpectrum
import BiasAnalyzer from "../components/BiasAnalyzer"; // Componente BiasAnalyzer
import defaultImage from "../assets/fundo_sn.png"; // Imagem default

// 🔄 NewsCard RECEBE as funções de estado e toggle dos pais
export default function NewsCard({ noticia, isFavorito, toggleFavorito}) {
  // O user é obtido no componente para controlar a visibilidade do botão de favorito
  const { user } = useContext(AuthContext); 
  
  // Detalhes podem vir como 'detalhes' (Home) ou 'vies' (Guardados)
  const detalhes = noticia.detalhes || noticia.vies || {}; 
  const scores = detalhes.scores_ideologicos || [];
  
  // Determina o estado do botão (cheio ou vazio) usando a função passada pelo pai
  const favorito = isFavorito(noticia.url); 

  // Função para chamar o toggleFavorito do componente pai
  const handleToggle = () => {
      toggleFavorito(noticia);
  };

  return (
    <div
      // 🚨 CORREÇÃO: A propriedade 'key' foi removida.
      // A key deve ser fornecida pelo componente pai (Home.jsx) no map.
      className="news-card" // 🔄 Classe principal do card
    >
      {/* Imagem */}
      <div style={{ marginBottom: 10 }}>
        <img
          src={noticia.image || defaultImage}
          alt={noticia.title}
          style={{
            width: "100%",
            maxHeight: 160,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      </div>

      {/* Título + Descrição */}
      <div style={{ flex: 1 }}>
        <h2 className="news-title"> {/* 🔄 Classe news-title */}
          <a
            href={noticia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-link"
          >
            {noticia.title}
          </a>
        </h2>
        <p className="news-desc">{noticia.description}</p> {/* 🔄 Classe news-desc */}
        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#6b7280",
            marginBottom: 8,
          }}
        >
          Fonte: {noticia.source?.name || "Desconhecida"}
        </p>
      </div>

      {/* Spectro de viés */}
      {scores.length > 0 ? (
        <BiasSpectrum
            scores={scores}
            opinativo={detalhes.opinativo || 0}
        />
          ) : (
        /* Se não existe viés, executa a análise */
        <BiasAnalyzer
            titulo={noticia.title}
            description={noticia.description}
            existingDetails={null}
        />
    )}


      {/* Botão de Favorito - NOVO ESTILO (Visível apenas se houver user) */}
      {user && (
        <div className="favorito-button-container" style={{ textAlign: "center", paddingTop: 10, marginTop: 10, borderTop: "1px solid #f3f4f6" }}>
            <button
                onClick={handleToggle} // Chama a função que adiciona/remove
                title={favorito ? "Remover favorito" : "Guardar favorito"}
                // Aplica a classe is-favorito se estiver guardado
                className={`favorite-toggle-btn ${favorito ? 'is-favorito' : ''}`}
            >
                <span role="img" aria-label="favorito">
                    {favorito ? "★" : "☆"}
                </span>
                {favorito ? " Guardado" : " Guardar"}
            </button>
        </div>
      )}
      
      {/* Link para ver notícia - Estilo com Hover e Opacidade */}
      <div style={{ marginTop: 15, textAlign: "center" }}>
        <a
          href={noticia.url}
          target="_blank"
          rel="noopener noreferrer"
          className="news-full-link" // Usa a classe para o estilo de opacidade/hover
        >
          <i className="fas fa-info-circle"></i> Ler notícia completa
        </a>
      </div>
    </div>
  );
}