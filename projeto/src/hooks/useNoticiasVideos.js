import { useState, useEffect, useRef } from "react";

const GNEWS_KEY = import.meta.env.VITE_GNEWS_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// 🔹 Mantendo o URL que funciona na tua Home
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`;

export function useNoticiasVideos(manualQuery, limit) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noticiaOriginal, setNoticiaOriginal] = useState(null);

  // 🔹 SOLUÇÃO PARA O "TOO MANY REQUESTS":
  // O useRef impede que o código corra mais do que uma vez por mudança de query.
  const requisicaoEmCurso = useRef(false);
  const ultimaQuery = useRef("");

  useEffect(() => {
    // 1. Variável para controlar se o componente ainda está montado
    let isMounted = true;

    // Se a query for a mesma e já estivermos a processar, ignoramos
    if (requisicaoEmCurso.current && ultimaQuery.current === manualQuery) return;

    async function executarFluxoCompleto() {
      // 2. Verifica se ainda está montado antes de iniciar
      if (!isMounted) return;

      console.log("[DEBUG] Iniciando fluxo de vídeos...");
      setLoading(true);
      requisicaoEmCurso.current = true;
      ultimaQuery.current = manualQuery;

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
            // Só atualiza o estado se ainda estiver montado
            if (isMounted) setNoticiaOriginal(noticiaSorteada);
            tituloParaIA = noticiaSorteada.title;
          }

          let keywords = "política Portugal";
          try {
            // Chamada ao Gemini simplificada (sem 'role') para evitar erro 400
            const geminiRes = await fetch(GEMINI_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Extrai apenas 3 palavras-chave simples desta notícia para pesquisa no YouTube: "${tituloParaIA}"` }] }]
              })
            });

            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              const extractedKeywords = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (extractedKeywords) keywords = extractedKeywords;
            }
          } catch (error) {
            console.warn("Gemini falhou, usando fallback.", error);
          }
          
          queryFinal = `${keywords} notícias Portugal`;
          
        } else {
          queryFinal = `${manualQuery} notícias política`;
          if (isMounted) setNoticiaOriginal(null);
        }

        // 3. Verifica se ainda está montado antes do pedido ao YouTube
        if (!isMounted) return;

        // 🔹 PESQUISA YOUTUBE
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(queryFinal)}&relevanceLanguage=pt&regionCode=PT&key=${YT_KEY}`;
        
        const ytRes = await fetch(ytUrl);
        const ytData = await ytRes.json();

        if (!ytRes.ok) {
          if (isMounted) {
            console.error("[DEBUG] Erro YouTube Detalhado:", ytData.error?.message || ytData.error);
            setVideos([]);
          }
          return;
        }

        // 4. Só atualiza os vídeos se o componente ainda estiver ativo
        if (isMounted) {
          setVideos(ytData.items || []);
        }

      } catch (error) {
        if (isMounted) console.error("[DEBUG] Erro no fluxo:", error);
      } finally {
        // 5. Finaliza o estado apenas se montado
        if (isMounted) {
          setLoading(false);
          requisicaoEmCurso.current = false;
        }
      }
    }

    executarFluxoCompleto();

    // 6. Função de limpeza (Cleanup): essencial para o StrictMode
    return () => {
      isMounted = false;
      requisicaoEmCurso.current = false;
    };
  }, [manualQuery, limit]);

  return { videos, loading, noticiaOriginal };
}