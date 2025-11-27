// src/pages/NoticiasLocais.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useFavoritos } from "../hooks/useFavoritos";
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import NewsCard from "../components/NewsCard";
// O hook useLocationData é mantido para fornecer os dados ao carregarFeed
import { useLocationData } from "../hooks/useLocationData"; 
import defaultImage from "../assets/fundo_sn.png";

// Importar o DisplayLocalizacao (que exibe a meteorologia/localização)
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao"; 

const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const TARGET = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;

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
//     CASCATA DE TERMOS
// ------------------------
function buildTermsFromLocation(loc) {
  if (!loc) return ["Portugal"];

  const t = [];

  if (loc.city) t.push(loc.city); 
  if (loc.nearbyCity) t.push(loc.nearbyCity); 
  if (loc.county) t.push(loc.county); 
  if (loc.state) t.push(loc.state); 

  if (loc.town && loc.town !== loc.city) t.push(loc.town);
  if (loc.village && loc.village !== loc.city) t.push(loc.village);
  if (loc.suburb && loc.suburb !== loc.city) t.push(loc.suburb);
  
  t.push("Portugal"); 

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

  // 🔑 NECESSÁRIO: Obter location, loading para o carregarFeed
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
          // Viés será injetado/analisado pelo NewsCard/BiasAnalyzer
          vies: noticia.detalhes || {}, 
        });
      }
    } catch {
      alert("Erro ao guardar ou remover favorito.");
    }
  };

  // CARREGAR FEED --------------------------------
  const carregarFeed = useCallback(async () => {
    // Depende de location e locLoading para iniciar a pesquisa
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
            
            collected.push({
              ...a,
              id: a.url,
              image: a.image || defaultImage,
              detalhes: {}, // Detalhes vazios para o BiasAnalyzer analisar
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
      
      {/* 🔑 SOLUÇÃO: Passar a location por prop. Isto impede o DisplayLocalizacao de carregar a localização novamente. */}
      <div style={{ marginBottom: 18 }}>
        <DisplayLocalizacao location={location} /> 
      </div>

      {/* Separador */}
      <div style={{backgroundColor: "#9ca3af", padding: "25px", marginBottom: 20, borderRadius:"40px"}}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white"}}>📍Notícias Locais</h1>
        <p style={{ color: "#4b5563", marginBottom: 18 }}>
          Notícias Locais com análise de viés. Podes guardar artigos com a estrela.
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