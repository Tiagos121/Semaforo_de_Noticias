// src/pages/NoticiasLocais.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useFavoritos } from "../hooks/useFavoritos";
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import NewsCard from "../components/NewsCard";
import { useLocationData } from "../hooks/useLocationData";
import defaultImage from "../assets/fundo_sn.png";

const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const TARGET = 3;
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
//     CASCATA DE TERMOS (Otimizada)
// ------------------------
function buildTermsFromLocation(loc) {
  if (!loc) return ["Portugal"];

  const t = [];

  // Prioriza nomes mais prováveis de ter notícias dedicadas
  if (loc.city) t.push(loc.city);         // Nome principal (pode ser city/town/village/nearbyCity)
  if (loc.nearbyCity) t.push(loc.nearbyCity); // O nome da cidade mais próxima (se `city` for fraco)
  if (loc.county) t.push(loc.county);     // Concelho/Município
  if (loc.state) t.push(loc.state);       // Distrito/Estado

  // Termos mais específicos ou menos relevantes (último recurso)
  if (loc.town && loc.town !== loc.city) t.push(loc.town);
  if (loc.village && loc.village !== loc.city) t.push(loc.village);
  if (loc.suburb && loc.suburb !== loc.city) t.push(loc.suburb);
  
  t.push("Portugal"); // Fallback final

  // Garante que não há duplicados e remove nulos/vazios
  return [...new Set(t)].filter(Boolean);
}

// ------------------------
//      FETCH GNEWS
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

  // Aumentar a robustez da query para incluir 'noticias' no termo de pesquisa local
  const q = `noticias AND "${term}"`; 
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
    q
  )}&lang=pt&country=pt&max=5&apikey=${GNEWS_API_KEY}`;

  try {
    const res = await fetch(url);

    if (res.status === 429) {
      console.warn("429 GNews → limit atingido");
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
//      COMPONENTE
// ------------------------
export default function NoticiasLocais() {
  const { user } = useContext(AuthContext);
  const favoritos = useFavoritos();
  const isFavorito = (url) => favoritos.some((f) => f.url === url);

  const { location, loading: locLoading, error: locError } = useLocationData();

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
          vies: noticia.detalhes || null,
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
        // Se já tivermos o suficiente, não precisamos de mais pesquisas caras
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
              detalhes: a.detalhes || {},
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

      {locLoading && <p>A obter localização…</p>}
      {locError && <p style={{ color: "red" }}>{locError}</p>}

      {!locLoading && (
        <p style={{ marginBottom: 20 }}>
          📍 Local detectado: <strong>{location.city}</strong>
          {location.isFallback && <span> (Localização por defeito)</span>}
        </p>
      )}

      {loading && <p>A carregar notícias…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="news-grid" style={{ display: "grid", gap: 16 }}>
        {feed.map((noticia) => (
          <NewsCard
            key={noticia.url}
            noticia={noticia}
            isFavorito={isFavorito}
            toggleFavorito={toggleFavorito}
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