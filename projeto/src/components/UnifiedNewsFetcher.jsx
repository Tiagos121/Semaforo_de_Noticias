// src/components/UnifiedNewsFetcher.jsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import defaultImage from "../assets/fundo_sn.png";

const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const MAX_NEWS_FETCH = 12; 
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minutos (Poupa muita quota)

// ============================================================
// 1. GESTOR DE PEDIDOS EM VOO (Evita duplicados simultâneos do StrictMode)
// ============================================================
const pendingRequests = new Map();

// ============================================================
// SANITIZAÇÃO
// ============================================================
function sanitizeQuery(term = "") {
  if (!term) return "";

  let t = term.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
  t = t.replace(/[^a-zA-Z0-9\s]/g, " "); 
  t = t.replace(/\s+/g, " ").trim();

  if (t.length > 60) t = t.slice(0, 57);

  return t;
}

// ============================================================
// CACHE
// ============================================================
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
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {
    console.warn("Falha ao escrever no localStorage");
  }
}

// ============================================================
// LEVENSHTEIN / NORMALIZAÇÃO / DEDUPE
// ============================================================
function levenshtein(a = "", b = "") {
  a = a || "";
  b = b || "";
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let v0 = new Array(bl + 1);
  let v1 = new Array(bl + 1);

  for (let i = 0; i <= bl; i++) v0[i] = i;

  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    const ai = a.charAt(i);
    for (let j = 0; j < bl; j++) {
      const cost = ai === b.charAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    const tmp = v0;
    v0 = v1;
    v1 = tmp;
  }
  return v0[bl];
}

function normalizeText(t = "") {
  return (t || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(
      /[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,\-./:;<=>?@[\\\]^_`{|}~]/g,
      ""
    )
    .trim();
}

function preferArticle(a, b) {
  const aHasImg = !!a.image;
  const bHasImg = !!b.image;

  if (aHasImg !== bHasImg) return aHasImg ? a : b;

  const aDesc = (a.description || "").length;
  const bDesc = (b.description || "").length;
  if (aDesc !== bDesc) return aDesc > bDesc ? a : b;

  const aSource = (a.source?.name || "").trim();
  const bSource = (b.source?.name || "").trim();
  const aHasSource = aSource.length > 0;
  const bHasSource = bSource.length > 0;

  if (aHasSource !== bHasSource) return aHasSource ? a : b;

  return a;
}

// ============================================================
// FETCH GNEWS BLINDADO (Com proteção de duplicados)
// ============================================================
const fetchGNews = async (term, max = MAX_NEWS_FETCH) => {
  if (!GNEWS_API_KEY) {
    console.warn("GNews API key ausente.");
    return [];
  }

  const query = sanitizeQuery(term);
  if (!query) return [];

  const cacheKey = `gnews_${query}`;
  
  // 1. Verifica Cache Local
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Verifica se já existe um pedido igual A DECORRER
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // 3. Cria a promessa do pedido
  const fetchPromise = (async () => {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
      query
    )}&lang=pt&country=pt&max=${max}&apikey=${GNEWS_API_KEY}`;

    try {
      const res = await fetch(url);

      if (res.status === 429) {
        console.warn("GNews 429 (rate limit)");
        return [];
      }

      if (res.status === 400) {
        console.warn("⚠️ GNews 400 — query inválida:", query);
        return [];
      }

      if (!res.ok) {
        console.warn("GNews erro:", res.status);
        return [];
      }

      const data = await res.json();
      const articles = data.articles || [];
      
      // Só guarda em cache se tiver sucesso
      if (articles.length > 0) {
        cacheSet(cacheKey, articles);
      }
      return articles;

    } catch (err) {
      console.warn("Erro fetch GNews:", err);
      return [];
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  // Regista o pedido nos pendentes
  pendingRequests.set(cacheKey, fetchPromise);

  return fetchPromise;
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function UnifiedNewsFetcher({ terms = [], target = 8, render }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const prevTermsRef = useRef("");

  const updateFeedBias = useCallback((id, result) => {
    setFeed(prev =>
      prev.map(n => n.id === id ? { ...n, detalhes: result } : n)
    );
  }, []);

  useEffect(() => {
    const termsString = JSON.stringify(terms);
    if (prevTermsRef.current === termsString) return;
    prevTermsRef.current = termsString;

    let isMounted = true;
    
    const carregarNoticias = async () => {
      setLoading(true);
      setError(null);

      try {
        let allArticles = [];
        
        const promises = terms.map(term => fetchGNews(term, MAX_NEWS_FETCH));
        const results = await Promise.all(promises);
        
        results.forEach(arr => allArticles.push(...arr));

        if (!isMounted) return;

        if (!allArticles.length) {
          setFeed([]);
          return;
        }

        // Deduplicação lógica
        const prepared = allArticles.map((art) => ({
          original: art,
          titleNorm: normalizeText(art.title || ""),
          descNorm: normalizeText(art.description || ""),
          src: (art.source?.name || "").toLowerCase().trim(),
        }));

        const kept = [];
        for (const p of prepared) {
          let isDup = false;
          for (let i = 0; i < kept.length; i++) {
            const k = kept[i];

            const dist = levenshtein(p.titleNorm, k.titleNorm);
            const maxLen = Math.max(p.titleNorm.length, k.titleNorm.length, 1);
            const rel = dist / maxLen;

            const descDist = levenshtein(
              p.descNorm.slice(0, 60),
              k.descNorm.slice(0, 60)
            );
            const descMax = Math.max(
              p.descNorm.slice(0, 60).length,
              k.descNorm.slice(0, 60).length,
              1
            );
            const descRel = descDist / descMax;

            const sameSource = p.src === k.src;

            const isTitleClose = rel <= 0.15; // Ajustei ligeiramente para ser mais estrito
            const isMaybe = rel <= 0.25 && (descRel <= 0.2 || sameSource);

            if (isTitleClose || isMaybe) {
              isDup = true;
              const chosen = preferArticle(p.original, k.original);
              if (chosen === p.original) kept[i] = p;
              break;
            }
          }
          if (!isDup) kept.push(p);
        }

        const processed = kept
          .slice(0, target)
          .map((x) => ({
            ...x.original,
            id:
              x.original.url ||
              `${x.titleNorm}-${Math.random().toString(36).slice(2, 9)}`,
            image: x.original.image || defaultImage,
            detalhes: {}, 
          }));

        setFeed(processed);
      } catch (err) {
        console.error("Erro ao carregar notícias:", err);
        if (isMounted) setError("Erro ao carregar notícias.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    carregarNoticias();

    return () => { isMounted = false; };
  }, [terms, target]);

  return render(feed, loading, error, updateFeedBias);
}