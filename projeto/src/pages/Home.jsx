// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useFavoritos } from "../hooks/useFavoritos";
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import NewsCard from "../components/NewsCard";
import BiasAnalyzer from "../components/BiasAnalyzer";
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao";
import defaultImage from "../assets/fundo_sn.png";

const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const MAX_NEWS = 8; // número máximo de artigos a pedir ao GNews (ajusta se quiseres)
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutos cache para GNews / Bias

// Simple localStorage cache helpers (mínimo)
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > parsed.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch (err) {
    console.warn("cacheGet falhou:", err);
    return null;
  }
}
function cacheSet(key, value, ttl = CACHE_TTL_MS) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), ttl, value }));
  } catch (err) {
    console.warn("cacheSet falhou:", err);
  }
}

export default function Home() {
  const { user } = useContext(AuthContext);
  const favoritos = useFavoritos();
  const isFavorito = (url) => favoritos.some((f) => f.url === url);

  const [feed, setFeed] = useState([]); // artigos com detalhe (inclui .detalhes vindo do BiasAnalyzer)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // toggle favorito (chama helpers firebase)
  const toggleFavorito = async (noticia) => {
    if (!user) {
      alert("Faz login para guardar favoritos.");
      return;
    }

    const existe = isFavorito(noticia.url);
    try {
      if (existe) {
        const fav = favoritos.find((f) => f.url === noticia.url);
        if (fav?.id) await removerFavorito(fav.id);
      } else {
        await adicionarFavorito(user.uid, {
          url: noticia.url,
          title: noticia.title,
          description: noticia.description,
          image: noticia.image || defaultImage,
          source: noticia.source || {},
          vies: noticia.detalhes || null,
        });
      }
    } catch (err) {
      console.error("Erro favorites:", err);
      alert("Erro ao guardar/remover favorito.");
    }
  };

  // Busca GNews (com cache simples)
  const fetchGNews = useCallback(async (query, max = MAX_NEWS) => {
    if (!GNEWS_API_KEY) {
      console.warn("GNews API key ausente — fetch abortado.");
      return [];
    }

    const cacheKey = `gnews_${query}_${max}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=pt&country=pt&max=${max}&apikey=${GNEWS_API_KEY}`;

    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn("GNews 429 (rate limit) — devolvendo vazio.");
        return [];
      }
      if (!res.ok) {
        console.warn("GNews fetch erro:", res.status);
        return [];
      }

      const data = await res.json();
      const articles = data.articles || [];
      cacheSet(cacheKey, articles);
      return articles;
    } catch (err) {
      console.warn("Erro fetch GNews:", err);
      return [];
    }
  }, []);

  // Pede a análise de viés para um artigo via BiasAnalyzer com cache por URL/trecho
  const analyzeWithCache = useCallback(async (article) => {
    const biasCacheKey = `bias_${article.url || article.title}`;
    const cached = cacheGet(biasCacheKey);
    if (cached) return cached;

    // Preparar payload para o BiasAnalyzer — o teu BiasAnalyzer deve aceitar objeto ou string
    // Se o teu BiasAnalyzer espera string, altera para `${article.title} - ${article.description}`
    const payload = {
      title: article.title,
      description: article.description || "",
      content: article.content || "",
      source: article.source || {},
    };

    try {
      const result = await BiasAnalyzer(payload);
      cacheSet(biasCacheKey, result, 1000 * 60 * 60); // 1h
      return result;
    } catch (err) {
      console.error("BiasAnalyzer falhou:", err);
      // devolve fallback neutro
      const fallback = {
        label: "centro",
        score: "N/A",
        detalhes: {
          opinativo: 0,
          justificacao: "Análise indisponível (fallback).",
          scores_ideologicos: [
            { label: "esquerda", score: 33.3 },
            { label: "centro", score: 33.3 },
            { label: "direita", score: 33.3 },
          ],
        },
      };
      return fallback;
    }
  }, []);

  // Função principal: carrega notícias e analisa viés para cada uma
  const carregarNoticias = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Query mais geral para Home (mais abrangente para reduzir risco de zero resultados)
      const query =
        opts.query ||
        "política portuguesa OR governo OR eleições OR economia OR sociedade OR atualidade";
      const articles = await fetchGNews(query, MAX_NEWS);

      if (!articles || articles.length === 0) {
        setFeed([]);
        setLoading(false);
        return;
      }

      const processed = [];
      for (const art of articles) {
        const artigo = {
          ...art,
          image: art.image || defaultImage,
        };

        const vies = await analyzeWithCache(artigo);
        processed.push({
          ...artigo,
          detalhes: vies.detalhes || vies,
        });

        // pequeno delay para suavizar chamadas ao Gemini/BiasAnalyzer
        await new Promise((r) => setTimeout(r, 300));
      }

      setFeed(processed);
    } catch (err) {
      console.error("Erro ao carregar notícias:", err);
      setError("Erro ao carregar notícias. Vê o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  }, [fetchGNews, analyzeWithCache]);

  // Inicial fetch
  useEffect(() => {
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
        {feed.map((noticia) => (
          <NewsCard key={noticia.url} noticia={noticia} isFavorito={isFavorito} toggleFavorito={toggleFavorito} />
        ))}
      </div>

      {!loading && feed.length === 0 && (
        <div style={{ marginTop: 18 }}>
          <p className="placeholder">Nenhuma notícia encontrada no momento.</p>
        </div>
      )}
    </div>
  );
}
