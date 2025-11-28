// src/pages/NoticiasLocais.jsx
import React, { useContext } from "react";
// Caminhos corrigidos para o contexto
import { AuthContext } from "../context/AuthContextValue"; 
// Caminhos corrigidos para hooks de favoritos
import { useFavoritos } from "../hooks/useFavoritos"; 
// Caminhos corrigidos para firebase/favoritos
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";

// Componentes
// Caminhos corrigidos para componentes
import NewsCard from "../components/NewsCard"; 
import UnifiedNewsFetcher from "../components/UnifiedNewsFetcher";
// import DisplayLocalizacao - REMOVIDO para evitar sobrecarga de API

// Hooks Essenciais
// Caminhos corrigidos para hooks
import { useLocationData } from "../hooks/useLocationData"; 
import { useLocalNewsTerms } from "../hooks/useLocalNewsTerms"; // <-- Novo Hook!

// Constantes
const MAX_NEWS_LOCAL_DISPLAY = 8; 

export default function NoticiasLocais() {
  const { user } = useContext(AuthContext);
  const favoritos = useFavoritos();

  // 1. OBTENÇÃO DA LOCALIZAÇÃO (Chamado apenas UMA vez)
  const { location, loading: locationLoading, error: locationError } = useLocationData();
  
  // 2. GERAÇÃO DOS TERMOS DE PESQUISA COM FALLBACK (Novo Hook)
  // Assumimos que o useLocalNewsTerms agora retorna 'queryTerms', 'cityName' E 'currentLevel'.
  const { queryTerms, cityName, currentLevel } = useLocalNewsTerms(location);
  
  // Funções de Favoritos (Omitidas para brevidade)
  const isFavorito = (url) => favoritos.some((f) => f.url === url);

  const toggleFavorito = async (noticia) => {
    if (!user) {
      // Usar uma modal em vez de alert
      console.log("Precisas de fazer login para guardar favoritos.");
      return;
    }
    const ja = isFavorito(noticia.url);
    try {
      if (ja) {
        const fav = favoritos.find((f) => f.url === noticia.url);
        if (fav?.id) {
          await removerFavorito(fav.id);
          // Usar uma modal em vez de alert
          console.log("✅ Removido dos Guardados.");
        }
      } else {
        const toSave = {
          url: noticia.url,
          title: noticia.title,
          description: noticia.description,
          image: noticia.image,
          source: noticia.source || {},
          vies: noticia.detalhes || null,
        };
        await adicionarFavorito(user.uid, toSave);
        // Usar uma modal em vez de alert
        console.log("⭐ Guardado nos Favoritos!");
      }
    } catch (error) {
      console.error("ERRO FIREBASE:", error);
      // Usar uma modal em vez de alert
      console.log(`ERRO DE FIREBASE: ${error.message}`);
    }
  };


  // 3. LÓGICA DE CARREGAMENTO INICIAL DA LOCALIZAÇÃO (Simplificada)
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
  const searchLevelDescription = currentLevel 
    ? `(A pesquisar por: ${cityName} - Nível: ${currentLevel.toUpperCase()})` 
    : `(A pesquisar por: ${cityName})`;
  
  return (
    <div className="page-container" style={{ padding: 20 }}>
      {/* 4. DisplayLocalizacao REMOVIDO DAQUI para evitar duplicação de pedidos de localização. */}

      <div style={{backgroundColor: "#9ca3af", padding: "25px", marginBottom: 20, borderRadius:"40px"}}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white"}}>📍Notícias Locais ({cityName})</h1>
        {/* 5. ALTERAÇÃO AQUI: Adicionar o nível de pesquisa no subtítulo */}
        <p style={{ color: "white", marginBottom: 0 }}>
          Notícias da sua área de {cityName} com análise de viés. {searchLevelDescription}
        </p>
      </div>
      
      {locationError && (
        <div style={{ padding: 12, background: "#fff0f0", borderRadius: 8, marginBottom: 12, color: "#b91c1c" }}>
          <strong>Erro de Localização:</strong> {locationError}
        </div>
      )}


      {/* 6. CHAMA O UNIFIEDNEWSFETCHER */}
      <UnifiedNewsFetcher 
          terms={queryTerms} // Usamos a lista de termos gerada pelo useLocalNewsTerms
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
                    Nenhuma notícia local encontrada para {cityName}. 
                    Tente ser mais genérico na sua pesquisa.
                  </p>
                </div>
              )}
            </>
          )}
      />
    </div>
  );
}