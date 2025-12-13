// src/pages/NoticiasLocais.jsx
import React from "react";
import { AuthContext } from "../context/AuthContextValue"; 
// ✅ APENAS ESTA IMPORTAÇÃO DO NOVO HOOK
import { useFavoritosActions } from "../hooks/useFavoritiosActions"; 

// Componentes
import NewsCard from "../components/NewsCard"; 
import UnifiedNewsFetcher from "../components/UnifiedNewsFetcher";

// Hooks Essenciais
import { useLocationData } from "../hooks/useLocationData"; 
import { useLocalNewsTerms } from "../hooks/useLocalNewsTerms"; 

// Constantes
const MAX_NEWS_LOCAL_DISPLAY = 4; 

export default function NoticiasLocais() {
  
  // 🛑 ÚNICA CHAMADA: Obtém todas as funções e a lista 'favoritos' do hook
  const { toggleFavorito, isFavorito, favoritos } = useFavoritosActions();

  // 1. OBTENÇÃO DA LOCALIZAÇÃO
  const { location, loading: locationLoading, error: locationError } = useLocationData();
  
  // 2. GERAÇÃO DOS TERMOS DE PESQUISA COM FALLBACK
  const { queryTerms, cityName, currentLevel } = useLocalNewsTerms(location);

  // 3. LÓGICA DE CARREGAMENTO INICIAL DA LOCALIZAÇÃO
  if (locationLoading) {
    return (
      <div className="page-container" style={{ padding: 20 }}>
        <div style={{ padding: 12, background: "#fff", borderRadius: 10, marginBottom: 12 }}>
          <strong>A detectar a sua localização para notícias locais...</strong>
        </div>
      </div>
    );
  }
  
  // Variável para a descrição
  const searchLevelDescription = currentLevel ? `(A pesquisar por: ${cityName} - Nível: ${currentLevel.toUpperCase()})` : `(A pesquisar por: ${cityName})`;
  
  return (
    <div className="page-container" style={{ padding: 20 }}>
      <div style={{backgroundColor: "#9ca3af", padding: "25px", marginBottom: 20, borderRadius:"40px"}}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white"}}>📍Notícias Locais ({cityName})</h1>
        <p style={{ color: "white", marginBottom: 0 }}>
          Notícias mais proximas de {cityName} com análise de viés. {searchLevelDescription}
        </p>
      </div>
      
      {locationError && (
        <div style={{ padding: 12, background: "#fff0f0", borderRadius: 8, marginBottom: 12, color: "#b91c1c" }}>
          <strong>Erro de Localização:</strong> {locationError}
        </div>
      )}

      {/* CHAMA O UNIFIEDNEWSFETCHER */}
      <UnifiedNewsFetcher 
          terms={queryTerms} 
          target={MAX_NEWS_LOCAL_DISPLAY}    
          render={(feed, loading, error) => (
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
                  <strong>A carregar notícias locais...</strong>
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
                    />
                  );
                })}
              </div>

              {!loading && feed.length === 0 && (
                <div style={{ marginTop: 18 }}>
                  <p className="placeholder">
                    Nenhuma notícia local encontrada para {cityName}. Tente novamente mais tarde.
                  </p>
                </div>
              )}
            </>
          )}
      />
    </div>
  );
}