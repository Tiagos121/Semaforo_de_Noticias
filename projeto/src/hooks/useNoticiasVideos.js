import { useState, useEffect } from "react";

const GNEWS_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

export function useNoticiasVideos(manualQuery, limit) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noticiaOriginal, setNoticiaOriginal] = useState(null);

  useEffect(() => {
    async function executarFluxoCompleto() {
      console.log("DEBUG YT KEY:", YT_KEY ? "Carregada" : "Vazia");
      console.log("DEBUG GEMINI KEY:", GEMINI_KEY ? "Carregada" : "Vazia");
      setLoading(true);
      try {
        let queryFinal = "";
        const isDefault = !manualQuery || manualQuery.trim() === "";

        if (isDefault) {
          // Adicionamos um timestamp aleatório para evitar que o navegador use uma resposta antiga em cache
          const antiCache = `&_cb=${new Date().getTime()}`;
          const gnewsRes = await fetch(
            `https://gnews.io/api/v4/top-headlines?category=politics&lang=pt&country=pt&max=5&apikey=${GNEWS_KEY}${antiCache}`
          );
          const gnewsData = await gnewsRes.json();
          
          let tituloParaIA = "notícias política Portugal";
          if (gnewsData.articles?.length > 0) {
            // Sorteia uma das 5 notícias principais para o conteúdo variar no refresh
            const noticiaSorteada = gnewsData.articles[Math.floor(Math.random() * gnewsData.articles.length)];
            setNoticiaOriginal(noticiaSorteada);
            tituloParaIA = noticiaSorteada.title;
          }

          let keywords = "política Portugal";
          try {
            const geminiRes = await fetch(GEMINI_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Extrai 3 palavras-chave de política PORTUGUESA: "${tituloParaIA}"` }] }]
              })
            });

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const extractedKeywords = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (extractedKeywords) {
                keywords = extractedKeywords;
              }
            } else {
              console.warn("Gemini falhou, a usar fallback manual.");
            }
          } catch (error) {
            console.warn("Erro ao chamar Gemini:", error.message);
          }
          
          // Fallback: se Gemini falhar, usa as primeiras 3 palavras do título
          if (keywords === "política Portugal") {
            keywords = tituloParaIA.split(" ").slice(0, 3).join(" ") || "política Portugal";
          }
          
          queryFinal = `${keywords} notícias Portugal RTP SIC TVI`;
          
        } else {
          let keywords = manualQuery;
          try {
            const geminiRes = await fetch(GEMINI_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Extrai 3 palavras-chave para pesquisa: "${manualQuery}"` }] }]
              })
            });
            
            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const extractedKeywords = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (extractedKeywords) {
                keywords = extractedKeywords;
              }
            } else {
              console.warn("Gemini falhou para pesquisa manual, usando query original.");
            }
          } catch (error) {
            console.warn("Erro ao chamar Gemini:", error.message);
          }
          
          queryFinal = `${keywords} notícias política`;
          setNoticiaOriginal(null);
        }

        // ALTERAÇÃO CRUCIAL: Adicionamos &order=date para garantir vídeos recentes
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(queryFinal)}&order=date&relevanceLanguage=pt&regionCode=PT&key=${YT_KEY}`;
        
        try {
          const ytRes = await fetch(ytUrl);
          
          if (!ytRes.ok) {
            if (ytRes.status === 403) {
              console.error("YouTube API: Acesso negado (403). Verifique se a chave da API está válida e tem as permissões corretas.");
            } else if (ytRes.status === 400) {
              console.error("YouTube API: Requisição inválida (400). Verifique os parâmetros da query.");
            } else {
              console.error(`YouTube API: Erro ${ytRes.status} - ${ytRes.statusText}`);
            }
            setVideos([]);
            return;
          }
          
          const ytData = await ytRes.json();
          
          if (ytData.error) {
            console.error("YouTube API Error:", ytData.error);
            setVideos([]);
            return;
          }

          setVideos(ytData.items ? ytData.items.slice(0, limit) : []);
        } catch (error) {
          console.error("Erro ao buscar vídeos do YouTube:", error);
          setVideos([]);
        }

      } catch (error) {
        console.error("Erro no fluxo:", error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }

    executarFluxoCompleto();
  }, [manualQuery, limit]);

  return { videos, loading, noticiaOriginal };
}