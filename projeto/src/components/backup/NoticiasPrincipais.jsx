import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext"; 

// --- DEFINIÇÕES DE CONSTANTES (PARA LEITURA FORA DO COMPONENTE) ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY;

const MODEL_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

export default function NoticiasPrincipais() {
  const { isLoggedIn, userProfile } = useAuth(); // <- LOGIN AGORA VEM DO CONTEXTO

  const simplerQueryTerms =
    "política portuguesa OR governo OR eleições";

  const NOTICIAS_API_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
    simplerQueryTerms
  )}&lang=pt&country=pt&max=3&apikey=${GNEWS_API_KEY}`;

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  // Função guardar notícia (AGORA REAGE AO LOGIN GLOBAL)
  const handleSaveNews = (noticia) => {
    if (!isLoggedIn) {
      alert("⚠️ Tem de iniciar sessão com Google para guardar notícias.");
      return;
    }

    console.log("Notícia guardada:", noticia);
    alert(`Notícia guardada por ${userProfile?.name}`);
  };

  // --- Função LLM de análise (igual à tua versão) ---
  const analisarViés = useCallback(
    async (texto) => {
      const key = GEMINI_API_KEY;
      if (!key) {
        throw new Error(
          "A chave GEMINI_API_KEY não está configurada. Não é possível analisar o viés."
        );
      }

      const systemPrompt = `Você é um analista de media especialista em detetar viés político...`;

      const userQuery = `Analise o seguinte texto (Fonte: ${
        texto.source?.name
      }): "${texto.title} - ${texto.description} - ${
        texto.content || "Sem conteúdo adicional"
      }"`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          esquerda_percent: { type: "NUMBER" },
          direita_percent: { type: "NUMBER" },
          centro_informativo_percent: { type: "NUMBER" },
          caracter_opinativo_percent: { type: "NUMBER" },
          justificacao_curta: { type: "STRING" },
        },
      };

      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      };

      const apiUrl = `${MODEL_API_URL}?key=${key}`;

      const MAX_TRIES = 3;
      for (let i = 0; i < MAX_TRIES; i++) {
        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 15000));
            continue;
          }

          const result = await res.json();
          const jsonText =
            result.candidates?.[0]?.content?.parts?.[0]?.text;

          const parsed = JSON.parse(jsonText);

          return {
            label:
              parsed.esquerda_percent > parsed.direita_percent
                ? "esquerda"
                : parsed.direita_percent > parsed.esquerda_percent
                ? "direita"
                : "centro",
            score: Math.max(
              parsed.esquerda_percent,
              parsed.direita_percent,
              parsed.centro_informativo_percent
            ),
            detalhes: parsed,
          };
        } catch (e) {
          if (i === MAX_TRIES - 1) throw e;
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    },
    [GEMINI_API_KEY]
  );

  // Carregar notícias
  const carregarEClassificarNoticias = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const noticiasRes = await fetch(NOTICIAS_API_URL);
      const noticiasData = await noticiasRes.json();

      const artigos = noticiasData.articles ?? [];

      const classificados = [];
      for (const artigo of artigos) {
        const vies = await analisarViés(artigo);
        classificados.push({ ...artigo, ...vies });
        await new Promise((r) => setTimeout(r, 500));
      }

      setFeed(classificados);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [NOTICIAS_API_URL, analisarViés]);

  useEffect(() => {
    if (!fetched) {
      carregarEClassificarNoticias();
      setFetched(true);
    }
  }, [fetched]);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">📰 Notícias Principais</h1>

      {loading && <p>A carregar...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feed.map((noticia, index) => (
          <div
            key={index}
            className="bg-white p-4 rounded shadow border"
          >
            <p className="text-sm text-gray-500">
              {noticia.source.name}
            </p>

            <h2 className="text-lg font-bold">{noticia.title}</h2>

            <p className="text-gray-700">{noticia.description}</p>

            {/* Vies */}
            <p className="mt-2 text-sm font-medium">
              Viés: {noticia.label} ({noticia.score}%)
            </p>

            {/* Botão Guardar */}
            <button
              onClick={() => handleSaveNews(noticia)}
              disabled={!isLoggedIn}
              className={`mt-4 px-3 py-2 rounded text-white ${
                isLoggedIn
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Guardar Notícia
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
