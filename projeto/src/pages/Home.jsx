// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";

const MODEL_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
  
const CACHE_KEY = 'cachedFeedData'; // Chave para o sessionStorage

// 🔄 CORREÇÃO CRÍTICA: Mover a URL e o CACHE_BUST para FORA da função Home
// Isto garante que a URL é estável e não causa re-renderizações infinitas.
const queryTermoPolitica = "política portuguesa OR governo OR eleições";
const CACHE_BUST = Date.now(); 
const NOTICIAS_API_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(queryTermoPolitica)}&lang=pt&country=pt&max=5&apikey=${GNEWS_API_KEY}&cache=${CACHE_BUST}`;


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
      }
    } catch (error) {
      console.error("ERRO CRÍTICO NA FIREBASE:", error); 
      alert(`ERRO DE FIREBASE: ${error.message}. Verifique as Permissões.`);
    }
  };

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  // 1. Função de Análise de Viés usando LLM (Gemini)
  const analisarViés = useCallback(async (texto) => {
    const key = GEMINI_API_KEY;
    if (!key) {
      console.error("A chave GEMINI_API_KEY não está configurada.");
      return { detalhes: { opinativo: 0, justificacao: "API Key em falta." } };
    }

    const systemPrompt = `Você é um analista de media especialista em detetar viés político em notícias portuguesas. O seu objetivo é classificar a tendência ideológica do texto...`; 
    const userQuery = `Analise o seguinte texto (Fonte: ${texto.source?.name || "Desconhecida"}): "${texto.title} - ${texto.description} - ${texto.content || 'Sem conteúdo adicional'}"`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        esquerda_percent: { type: "NUMBER", description: "0-100" },
        direita_percent: { type: "NUMBER", description: "0-100" },
        centro_informativo_percent: { type: "NUMBER", description: "0-100" },
        caracter_opinativo_percent: { type: "NUMBER", description: "0-100" },
        justificacao_curta: { type: "STRING", description: "máx 3 frases" }
      },
      propertyOrdering: ["esquerda_percent", "direita_percent", "centro_informativo_percent", "caracter_opinativo_percent", "justificacao_curta"]
    };

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    };

    const apiUrl = `${MODEL_API_URL}?key=${key}`;
    const MAX_TRIES = 3;
    for (let i = 0; i < MAX_TRIES; i++) {
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.status === 429) {
          const wait = Math.pow(2, i) * 10000;
          console.warn(`Rate limit. Esperando ${wait/1000}s...`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        if (!res.ok) {
          throw new Error(`Gemini: ${res.status}`);
        }

        const result = await res.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (jsonText) {
          const parsedJson = JSON.parse(jsonText);

          let total = (parsedJson.esquerda_percent || 0) + (parsedJson.direita_percent || 0) + (parsedJson.centro_informativo_percent || 0);
          if (total === 0) total = 100;

          const scores = [
            { label: "esquerda", score: (parsedJson.esquerda_percent / total) * 100 },
            { label: "direita", score: (parsedJson.direita_percent / total) * 100 },
            { label: "centro", score: (parsedJson.centro_informativo_percent / total) * 100 }
          ].sort((a, b) => b.score - a.score);

          return {
            label: scores[0].label,
            score: scores[0].score.toFixed(1),
            detalhes: {
              opinativo: parsedJson.caracter_opinativo_percent || 0,
              justificacao: parsedJson.justificacao_curta || "Análise breve.",
              scores_ideologicos: scores
            }
          };
        }
      } catch (e) {
        if (i === MAX_TRIES - 1) {
          console.error("Falha na chamada Gemini:", e);
          return { detalhes: { opinativo: 0, justificacao: "Falha na classificação." } };
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    return { detalhes: { opinativo: 0, justificacao: "Timeout" } };
  }, [GEMINI_API_KEY]); 

  // 2. Buscar e classificar notícias (COM CACHE)
  const carregarEClassificarNoticias = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const noticiasRes = await fetch(NOTICIAS_API_URL);
      if (!noticiasRes.ok) {
        if (noticiasRes.status === 429) throw new Error("GNews: Limite diário atingido. Tenta mais tarde.");
        throw new Error(`GNews: ${noticiasRes.status}`);
      }

      const noticiasData = await noticiasRes.json();
      if (!noticiasData.articles || noticiasData.articles.length === 0) {
        throw new Error("Nenhuma notícia política encontrada com os filtros atuais.");
      }

      const artigosComVies = [];
      const lista = noticiasData.articles;

      for (const artigo of lista) {
        const textoParaAnalise = {
          title: artigo.title,
          description: artigo.description,
          content: artigo.content,
          source: artigo.source
        };

        if (artigo.title) {
          let vies = null;
          try {
            vies = await analisarViés(textoParaAnalise);
          } catch (e) {
            console.warn("Erro analisando viés:", e);
            vies = { detalhes: { opinativo: 0, justificacao: "Erro análise" } };
          }

          artigosComVies.push({
            ...artigo,
            id: artigo.url,
            image: artigo.image || defaultImage,
            detalhes: vies.detalhes
          });

          // Atraso de 1 segundo para evitar rate limit da IA
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          artigosComVies.push({
            ...artigo,
            id: artigo.url,
            image: artigo.image || defaultImage,
            detalhes: {}
          });
        }
      }

      setFeed(artigosComVies);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(artigosComVies)); 

    } catch (err) {
      console.error("Erro ao carregar ou classificar:", err);
      setError(err.message || "Ocorreu um erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [analisarViés, NOTICIAS_API_URL]); // 🔄 Dependências corretas

  // 3. Efeito de Carregamento com Cache
  useEffect(() => {
    const cachedData = sessionStorage.getItem(CACHE_KEY);

    if (cachedData) {
        try {
            const parsedData = JSON.parse(cachedData);
            setFeed(parsedData);
            setLoading(false);
            setFetched(true); 
            return;
        } catch (e) {
            console.error("Erro ao ler cache:", e);
            sessionStorage.removeItem(CACHE_KEY); 
        }
    }

    if (!fetched) {
        carregarEClassificarNoticias();
        setFetched(true);
    }
  }, [carregarEClassificarNoticias]);


  // RENDER
  return (
    <div className="page-container">
      <div style={{ marginBottom: 18 }}>
        <DisplayLocalizacao />
      </div>

      <h1 className="page-title" style={{ backgroundColor: "rgb(79, 70, 229)", color: 'white', padding: '10px', textAlign: 'center' }}>
        📰 Notícias de Política & Análise de Viés
      </h1>

      {loading && (
        <div style={{ padding: 12, background: "#fff", borderRadius: 8, marginBottom: 12, color: "#374151" }}>
          <strong>A carregar notícias políticas e a analisar viés...</strong>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: "#fff0f0", borderRadius: 8, marginBottom: 12, color: "#9b1c1c" }}>
          <strong>Erro: </strong>{error}
        </div>
      )}

      <div className="news-grid" style={{ display: "grid", gap: 16 }}>
        {feed.map((noticia) => {
            const favorito = isFavorito(noticia.url); 

            // LÓGICA DE SINCRONIZAÇÃO DO VIÉS
            const favoritoData = favoritos.find(f => f.url === noticia.url);
            let noticiaParaCard = noticia;

            if (favorito && favoritoData && favoritoData.vies) {
                noticiaParaCard = {
                    ...noticia,
                    detalhes: favoritoData.vies, // Substitui o viés calculado pelo viés salvo
                };
            }
            
            // 🔑 USAMOS APENAS o NewsCard - Corrigindo o erro de navegação
            return (
                <NewsCard 
                    key={noticia.id || noticia.url} 
                    noticia={noticiaParaCard} 
                    isFavorito={isFavorito}
                    toggleFavorito={toggleFavorito}
                    favoritos={favoritos} 
                />
            );
        })}
      </div>
    </div>
  );
}