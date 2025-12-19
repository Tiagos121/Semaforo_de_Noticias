// src/pages/Home.jsx
import React from "react"; 
import { AuthContext } from "../context/AuthContextValue";
// ✅ IMPORTAÇÃO DO NOVO HOOK CENTRALIZADO
import { useFavoritosActions } from "../hooks/useFavoritiosActions"; 

// Meteorologia
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao";

// Componentes
import NewsCard from "../components/NewsCard";
import UnifiedNewsFetcher from "../components/UnifiedNewsFetcher";

// Variáveis
const MAX_NEWS_DISPLAY = 4;
const queryTermoPolitica = "política portuguesa OR governo OR eleições";


export default function Home() {
  
  // ÚNICA CHAMADA: Obtém todas as funções e a lista 'favoritos' do hook centralizado
  const { toggleFavorito, isFavorito, favoritos } = useFavoritosActions();
 
  return (
    <div className="page-container" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <DisplayLocalizacao />
      </div>

      <div
        style={{
          backgroundColor: "#9ca3af",
          padding: "25px",
          marginBottom: 20,
          borderRadius: "40px",
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white" }}>
          📰 Semáforo Notícias — Destaques
        </h1>
        <p style={{ color: "white", marginBottom: 18 }}>
          Notícias seleccionadas & análise de viés automática.
        </p>
      </div>
      
      <UnifiedNewsFetcher
        terms={[queryTermoPolitica]}
        target={MAX_NEWS_DISPLAY}
        render={(feed, loading, error, updateFeedBias) => (
          <>
            {loading && (
              <div
                style={{
                  padding: 12,
                  background: "#fff",
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              >
                <strong>A carregar notícias de Política...</strong>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: 12,
                  background: "#fff0f0",
                  borderRadius: 8,
                  marginBottom: 12,
                  color: "#b91c1c",
                }}
              >
                <strong>Erro:</strong> {error}
              </div>
            )}

            <div
              className="news-grid"
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              }}
            >
              {feed.map((noticia) => {
                const favorito = isFavorito(noticia.url);
                const favoritoData = favoritos.find((f) => f.url === noticia.url);
                let noticiaParaCard = noticia;

                // Se a notícia estiver guardada E tiver dados de viés, anexa-os para o Card
                if (favorito && favoritoData?.vies) {
                  noticiaParaCard = {
                    ...noticia,
                    detalhes: favoritoData.vies,
                  };
                }

                return (
                  <NewsCard
                    key={noticia.id || noticia.url}
                    noticia={noticiaParaCard}
                    isFavorito={isFavorito}
                    toggleFavorito={toggleFavorito}
                    updateFeedBias={updateFeedBias} // aqui passa a função do UnifiedNewsFetcher
                  />
                );
              })}
            </div>

            {!loading && feed.length === 0 && (
              <div style={{ marginTop: 18 }}>
                <p className="placeholder">Nenhuma notícia encontrada.</p>
              </div>
            )}
          </>
        )}
    />
    </div>
  );
}