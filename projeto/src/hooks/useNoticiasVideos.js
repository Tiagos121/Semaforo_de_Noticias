import { useState, useEffect, useRef } from "react";

const GNEWS_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

export function useNoticiasVideos(manualQuery, limit) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noticiaOriginal, setNoticiaOriginal] = useState(null);

  const executando = useRef(false);
  const queryAnterior = useRef(null); 

  useEffect(() => {
    let isMounted = true;
    
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
          //Fluxo Padrão (Baseado em Notícias Reais)
          
          let tituloParaIA = "notícias política Portugal";
          let noticiaSorteada = null;

          try {
            const antiCache = `&_cb=${new Date().getTime()}`;
            const gnewsRes = await fetch(
              `https://gnews.io/api/v4/top-headlines?category=politics&lang=pt&country=pt&max=5&apikey=${GNEWS_KEY}${antiCache}`
            );

            // Só processamos se o GNews responder OK (evita erros se a quota exceder)
            if (gnewsRes.ok) {
              const gnewsData = await gnewsRes.json();
              if (gnewsData.articles?.length > 0) {
                noticiaSorteada = gnewsData.articles[Math.floor(Math.random() * gnewsData.articles.length)];
                if (isMounted) setNoticiaOriginal(noticiaSorteada);
                tituloParaIA = noticiaSorteada.title;
              }
            } else {
               console.warn("GNews limit ou erro (usando fallback genérico).");
            }
          } catch (err) {
            console.warn("Erro ao buscar GNews (usando fallback).", err);
          }

          // Extração de Keywords via Gemini
          let keywords = "política Portugal atualidade";
          
          try {
            const geminiRes = await fetch(GEMINI_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Extrai apenas 3 palavras-chave principais e simples (sem pontuação) deste título de notícia: "${tituloParaIA}"` }] }]
              })
            });

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const extractedKeywords = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (extractedKeywords) {
                keywords = extractedKeywords.replace(/["]/g, ""); 
              }
            }
          } catch (error) {
            console.warn("Gemini falhou nos vídeos (usando keywords padrão).", error);
          }
          
          
          queryFinal = `${keywords} notícias Portugal`;
          
        } else {
          // --- FLUXO MANUAL (Pesquisa do Utilizador) ---
          queryFinal = `${manualQuery} notícias política Portugal`;
          if (isMounted) setNoticiaOriginal(null);
        }

        // --- YOUTUBE FETCH ---
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
        if (isMounted) console.error("Erro Geral no Hook de Vídeos:", error);
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
    };
  }, [manualQuery, limit]);

  return { videos, loading, noticiaOriginal };
}