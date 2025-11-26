// src/pages/NoticiasLocais.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useFavoritos } from "../hooks/useFavoritos";
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import NewsCard from "../components/NewsCard";
import { useLocationData } from "../hooks/useLocationData";
import defaultImage from "../assets/fundo_sn.png";

// 🔑 NOVO: Importar o componente de localização/meteorologia
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao"; 

const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const TARGET = 3;
const CACHE_TTL_MS = 5 * 60 * 1000;

// ------------------------
//     DADOS DE VIÉS PADRÃO (Para que o BiasSpectrum apareça)
// ------------------------
const DEFAULT_VIES_DETAILS = {
  opinativo: 0,
  justificacao: "Sem análise de viés (Notícia Local)",
  scores_ideologicos: [
    { label: "centro", score: 100 },
    { label: "esquerda", score: 0 },
    { label: "direita", score: 0 },
  ],
};

// ------------------------
//     LOCAL CACHE
// ------------------------
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value;

  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ ts: Date.now(), value })
    );
  } catch {
    console.warn("Falha ao escrever no cache local");
  }
}

// ------------------------
//     CASCATA DE TERMOS (Otimizada)
// ------------------------
function buildTermsFromLocation(loc) {
  if (!loc) return ["Portugal"];

  const t = [];

  // Prioriza nomes mais prováveis de ter notícias dedicadas
  if (loc.city) t.push(loc.city); 
  if (loc.nearbyCity) t.push(loc.nearbyCity); 
  if (loc.county) t.push(loc.county); 
  if (loc.state) t.push(loc.state); 

  // Termos mais específicos ou menos relevantes (último recurso)
  if (loc.town && loc.town !== loc.city) t.push(loc.town);
  if (loc.village && loc.village !== loc.city) t.push(loc.village);
  if (loc.suburb && loc.suburb !== loc.city) t.push(loc.suburb);
  
  t.push("Portugal"); // Fallback final

  // Garante que não há duplicados e remove nulos/vazios
  return [...new Set(t)].filter(Boolean);
}

// ------------------------
//     FETCH GNEWS
// ------------------------
async function fetchGNewsForTerm(term) {
  if (!term) return [];

  const cacheKey = `gnews_${term}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  if (!GNEWS_API_KEY) {
    console.warn("GNews key missing");
    return [];
  }

  const q = `noticias AND "${term}"`; 
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
    q
  )}&lang=pt&country=pt&max=5&apikey=${GNEWS_API_KEY}`;

  try {
    const res = await fetch(url);

    if (res.status === 429) {
      console.warn("429 GNews -> limit atingido");
      return [];
    }

    if (!res.ok) return [];

    const data = await res.json();
    const list = data.articles || [];

    cacheSet(cacheKey, list);
    return list;

  } catch (err) {
    console.warn("Erro ao pedir GNews:", err);
    return [];
  }
}

// ------------------------
//     COMPONENTE
// ------------------------
export default function NoticiasLocais() {
  const { user } = useContext(AuthContext);
  const favoritos = useFavoritos();
  const isFavorito = (url) => favoritos.some((f) => f.url === url);

  const { location, loading: locLoading } = useLocationData();

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // FAVORITOS --------------------------------
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
          // CORREÇÃO: Salvar os detalhes de viés padrão
          vies: noticia.detalhes || DEFAULT_VIES_DETAILS, 
        });
      }
    } catch {
      alert("Erro ao guardar ou remover favorito.");
    }
  };

  // CARREGAR FEED --------------------------------
  const carregarFeed = useCallback(async () => {
    if (!location || locLoading) return;

    setLoading(true);
    setError(null);

    try {
      const terms = buildTermsFromLocation(location);

      const collected = [];
      const seen = new Set();

      for (const t of terms) {
        if (collected.length >= TARGET) break;
        
        const arts = await fetchGNewsForTerm(t);

        for (const a of arts) {
          if (collected.length >= TARGET) break;

          if (!seen.has(a.url)) {
            seen.add(a.url);
            
            // CORREÇÃO: Injetar os detalhes de viés padrão
            collected.push({
              ...a,
              id: a.url,
              image: a.image || defaultImage,
              detalhes: DEFAULT_VIES_DETAILS, // <--- INJEÇÃO AQUI
            });
          }
        }
      }

      setFeed(collected.slice(0, TARGET));

    } catch {
      setError("Erro ao carregar notícias.");
    }

    setLoading(false);
  }, [location, locLoading]);

  useEffect(() => {
    carregarFeed();
  }, [carregarFeed]);

  // ----------------------
  //     RENDER
  // ----------------------
  return (
    <div className="page-container">
      <h1 className="page-title" style={{ textAlign: "center" }}>
        📰 Notícias Locais
      </h1>
      
      {/* 🔄 NOVO: Componente DisplayLocalizacao para consistência */}
      <div style={{ marginBottom: 18 }}>
        <DisplayLocalizacao />
      </div>

      {loading && <p>A carregar notícias…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="news-grid" style={{ display: "grid", gap: 16 }}>
        {feed.map((noticia) => (
          <NewsCard
            key={noticia.url}
            noticia={noticia}
            isFavorito={isFavorito}
            toggleFavorito={toggleFavorito}
            favoritos={favoritos} 
          />
        ))}
      </div>

      {!loading && feed.length === 0 && (
        <p className="placeholder" style={{ marginTop: 20 }}>
          Nenhuma notícia encontrada para a tua zona. A tentar: {buildTermsFromLocation(location).join(", ")}.
        </p>
      )}
    </div>
  );
}