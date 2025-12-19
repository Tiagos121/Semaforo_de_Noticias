import { useState, useEffect, useRef } from "react";

const GNEWS_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`;

export function useNoticiasVideos(manualQuery, limit) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noticiaOriginal, setNoticiaOriginal] = useState(null);

  // Controlo de execução para evitar duplicados
  const executando = useRef(false);
  const queryAnterior = useRef("");

  useEffect(() => {
    let isMounted = true;
    
    // Evita rodar se for a mesma query e já estivermos a carregar
    if (executando.current && queryAnterior.current === manualQuery) return;

    async function executarFluxoCompleto() {
      if (!isMounted) return;
      
      setLoading(true);
      executando.current = true;
      queryAnterior.current = manualQuery;

      try {
        let queryFinal = "";
        const isDefault = !manualQuery || manualQuery.trim() === "";

        if (isDefault) {
          const antiCache = `&_cb=${new Date().getTime()}`;
          const gnewsRes = await fetch(
            `https://gnews.io/api/v4/top-headlines?category=politics&lang=pt&country=pt&max=5&apikey=${GNEWS_KEY}${antiCache}`
          );
          const gnewsData = await gnewsRes.json();
          
          let tituloParaIA = "notícias política Portugal";
          if (gnewsData.articles?.length > 0) {
            const noticiaSorteada = gnewsData.articles[Math.floor(Math.random() * gnewsData.articles.length)];
            if (isMounted) setNoticiaOriginal(noticiaSorteada);
            tituloParaIA = noticiaSorteada.title;
          }

          let keywords = "política Portugal";
          try {
            const geminiRes = await fetch(GEMINI_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Extrai apenas 3 palavras-chave simples desta notícia: "${tituloParaIA}"` }] }]
              })
            });

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const extractedKeywords = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (extractedKeywords) keywords = extractedKeywords;
            }
          } catch (error) {
            console.warn("Gemini falhou nos vídeos.", error);
          }
          
          queryFinal = `${keywords} notícias Portugal`;
          
        } else {
          queryFinal = `${manualQuery} notícias política`;
          if (isMounted) setNoticiaOriginal(null);
        }

        // Busca YouTube
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(queryFinal)}&relevanceLanguage=pt&regionCode=PT&key=${YT_KEY}`;
        
        const ytRes = await fetch(ytUrl);
        const ytData = await ytRes.json();

        if (isMounted) {
          if (!ytRes.ok) {
            console.error("YouTube Erro:", ytData.error?.message);
            setVideos([]);
          } else {
            setVideos(ytData.items || []);
          }
        }

      } catch (error) {
        if (isMounted) console.error("Erro no Hook:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          executando.current = false;
        }
      }
    }

    executarFluxoCompleto();

    return () => { 
      isMounted = false; 
      executando.current = false;
    };
  }, [manualQuery, limit]);

  return { videos, loading, noticiaOriginal };
}