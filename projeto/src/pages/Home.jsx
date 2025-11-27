// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useContext } from "react"; // 🔑 CORRIGIDO: Garante que os hooks estão importados
import { AuthContext } from "../context/AuthContextValue";

// Meteorologia
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao";

// Favoritos (Firebase helpers e hook)
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import { useFavoritos } from "../hooks/useFavoritos";

// 🔑 ESSENCIAL: Importar o NewsCard
import NewsCard from "../components/NewsCard"; 

// Imagem default local
import defaultImage from "../assets/fundo_sn.png";

// Variáveis de API e Cache (Movidas para fora do componente para estabilidade)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const MAX_NEWS = 8;
const CACHE_KEY = 'cachedFeedData';

// Constantes GNews (Estáveis)
const queryTermoPolitica = "política portuguesa OR governo OR eleições";
const CACHE_BUST = Date.now(); 
const NOTICIAS_API_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(queryTermoPolitica)}&lang=pt&country=pt&max=${MAX_NEWS}&apikey=${GNEWS_API_KEY}&cache=${CACHE_BUST}`;


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
          alert("✅ Removido dos Guardados. Voltará a aparecer no Home."); 
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
        alert("⭐ Guardado! A notícia foi movida para a secção Guardados.");
      }
    } catch (error) {
      console.error("ERRO CRÍTICO NA FIREBASE:", error); 
      alert(`ERRO DE FIREBASE: ${error.message}. Verifique as Permissões.`);
    }
  };

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ❌ REMOVER: [fetched, setFetched] não é necessário e simplifica o useEffect.
  // const [fetched, setFetched] = useState(false); 


  // 1. Fetch GNews (APENAS CARREGA NOTÍCIAS)
  const fetchGNews = useCallback(async (query, max = MAX_NEWS) => {
    if (!GNEWS_API_KEY) {
        console.warn("GNews API key ausente — fetch abortado.");
        return [];
    }

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=pt&country=pt&max=${max}&apikey=${GNEWS_API_KEY}`;

    try {
        const res = await fetch(url);
        if (res.status === 429) {
            console.warn("GNews 429 (rate limit)");
            return [];
        }
        if (!res.ok) return [];

        const data = await res.json();
        const articles = data.articles || [];
        return articles;
    } catch (err) {
        console.warn("Erro fetch GNews:", err);
        return [];
    }
  }, []);


  // 2. Carregar Notícias (Limpo de Lógica de IA)
  const carregarNoticias = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);

    try {
        const query = opts.query || queryTermoPolitica; 
        const articles = await fetchGNews(query, MAX_NEWS);

        if (!articles || articles.length === 0) {
            setFeed([]);
            return;
        }

        const processed = [];
        for (const art of articles) {
            const artigo = {
                ...art,
                id: art.url,
                image: art.image || defaultImage,
                detalhes: {}, // Deixamos os detalhes vazios. O BiasAnalyzer vai preencher.
            };
            processed.push(artigo);
        }

        setFeed(processed);
    } catch (err) {
        console.error("Erro ao carregar notícias:", err);
        setError("Erro ao carregar notícias. Vê o console para mais detalhes.");
    } finally {
        setLoading(false);
    }
  }, [fetchGNews]);


  // 3. Efeito de Carregamento (Corrigido e Simplificado)
  useEffect(() => {
    // 🔑 CORRIGIDO: Chama carregarNoticias apenas na montagem (dependência vazia)
    carregarNoticias();
  }, [carregarNoticias]);


  // RENDER
  return (
    <div className="page-container" style={{ padding: 20 }}>
      {/* Localização / Meteorologia */}
      <div style={{ marginBottom: 16 }}>
        <DisplayLocalizacao />
      </div>

      <div style={{backgroundColor: "#9ca3af", padding: "25px", marginBottom: 20, borderRadius:"40px"}}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white"}}>📰 Semáforo Notícias — Destaques</h1>
        <p style={{ color: "#4b5563", marginBottom: 18 }}>
          Notícias seleccionadas & análise de viés (automática). Podes guardar artigos com a estrela.
        </p>
      </div>

      {loading && (
        <div style={{ padding: 12, background: "#fff", borderRadius: 10, marginBottom: 12 }}>
          <strong>A carregar notícias e a analisar viés…</strong>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: "#fff0f0", borderRadius: 8, marginBottom: 12, color: "#b91c1c" }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      <div
        className="news-grid"
        style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        {feed.map((noticia) => {
            const favorito = isFavorito(noticia.url); 

            // 🔑 LÓGICA DE SINCRONIZAÇÃO DO VIÉS
            const favoritoData = favoritos.find(f => f.url === noticia.url);
            let noticiaParaCard = noticia;

            if (favorito && favoritoData && favoritoData.vies) {
                noticiaParaCard = {
                    ...noticia,
                    detalhes: favoritoData.vies, // Substitui o viés atual pelo salvo
                };
            }

            // 🔑 USAMOS APENAS o NewsCard
            return (
                <NewsCard 
                    key={noticia.url} 
                    noticia={noticiaParaCard} 
                    isFavorito={isFavorito}
                    toggleFavorito={toggleFavorito} 
                />
            );
        })}
      </div>

      {!loading && feed.length === 0 && (
        <div style={{ marginTop: 18 }}>
          <p className="placeholder">Nenhuma notícia encontrada no momento.</p>
        </div>
      )}
    </div>
  );
}