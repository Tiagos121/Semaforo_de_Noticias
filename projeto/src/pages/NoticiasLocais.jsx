// src/pages/NoticiasLocais.jsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useFavoritos } from "../hooks/useFavoritos";
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";

// Componentes
import NewsCard from "../components/NewsCard";
import UnifiedNewsFetcher from "../components/UnifiedNewsFetcher";
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao";

// Hooks Essenciais
import { useLocationData } from "../hooks/useLocationData"; 

// Constantes
const MAX_NEWS_LOCAL_DISPLAY = 8; 

export default function NoticiasLocais() {
  const { user } = useContext(AuthContext);
  const favoritos = useFavoritos();

  // 1. OBTENÇÃO DA LOCALIZAÇÃO (Chamado apenas UMA vez)
  const { location, loading: locationLoading, error: locationError } = useLocationData();
  
  // Funções de Favoritos (Omitidas para brevidade)
  const isFavorito = (url) => favoritos.some((f) => f.url === url);

  const toggleFavorito = async (noticia) => {
    if (!user) {
      alert("Precisas de fazer login para guardar favoritos.");
      return;
    }
    const ja = isFavorito(noticia.url);
    try {
      if (ja) {
        const fav = favoritos.find((f) => f.url === noticia.url);
        if (fav?.id) {
          await removerFavorito(fav.id);
          alert("✅ Removido dos Guardados.");
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
        alert("⭐ Guardado nos Favoritos!");
      }
    } catch (error) {
      console.error("ERRO FIREBASE:", error);
      alert(`ERRO DE FIREBASE: ${error.message}`);
    }
  };


  // 2. LÓGICA DE CARREGAMENTO INICIAL DA LOCALIZAÇÃO
  if (locationLoading) {
    return (
      <div className="page-container" style={{ padding: 20 }}>
        <div style={{ padding: 12, background: "#fff", borderRadius: 10, marginBottom: 12 }}>
          <strong>A detectar a sua localização para notícias locais...</strong>
        </div>
      </div>
    );
  }
  
  // Usamos o nome da cidade JÁ LIMPO pelo hook useLocationData
  const cityName = location?.city || "Portugal";
  const queryTermosLocais = [`notícias ${cityName}`, `acontecimentos ${cityName}`];

  
  return (
    <div className="page-container" style={{ padding: 20 }}>
      {/* 3. DISPLAY DE LOCALIZAÇÃO (Componente Controlado) */}
      <div style={{ marginBottom: 16 }}>
        <DisplayLocalizacao location={location} /> 
      </div>

      <div style={{backgroundColor: "#9ca3af", padding: "25px", marginBottom: 20, borderRadius:"40px"}}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white"}}>📍Notícias Locais ({cityName})</h1>
        <p style={{ color: "#4b5563", marginBottom: 18 }}>
          Notícias da sua área de {cityName} com análise de viés.
        </p>
      </div>
      
      {locationError && (
        <div style={{ padding: 12, background: "#fff0f0", borderRadius: 8, marginBottom: 12, color: "#b91c1c" }}>
          <strong>Erro de Localização:</strong> {locationError}
        </div>
      )}


      {/* 4. CHAMA O UNIFIEDNEWSFETCHER */}
      <UnifiedNewsFetcher 
          terms={queryTermosLocais} 
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