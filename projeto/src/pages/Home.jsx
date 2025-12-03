// src/pages/Home.jsx
import React, { useContext } from "react"; // Removidos useEffect, useState, useCallback
import { AuthContext } from "../context/AuthContextValue";

// Meteorologia
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao";

// Favoritos
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import { useFavoritos } from "../hooks/useFavoritos";

// Card de notícia
import NewsCard from "../components/NewsCard";

// UnifiedNewsFetcher (Usado como fonte de dados)
import UnifiedNewsFetcher from "../components/UnifiedNewsFetcher"; 

// Imagem default
import defaultImage from "../assets/fundo_sn.png";

// Variáveis
const MAX_NEWS_DISPLAY = 4;
const queryTermoPolitica = "política portuguesa OR governo OR eleições";


export default function Home() {
 const { user } = useContext(AuthContext);
 const favoritos = useFavoritos();

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
     image: noticia.image || defaultImage,
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
    <p style={{ color: "#4b5563", marginBottom: 18 }}>
     Notícias seleccionadas & análise de viés automática.
    </p>
   </div>
      
      {/* 🟢 CORREÇÃO: Usamos 'terms' (array) e 'target' (número) */}
      <UnifiedNewsFetcher 
          terms={[queryTermoPolitica]} 
          target={MAX_NEWS_DISPLAY}    
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
                  <strong>A carregar notícias e a analisar viés…</strong>
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
                  <p className="placeholder">Nenhuma notícia encontrada.</p>
                </div>
              )}
            </>
          )}
      />
    </div>
  );
}