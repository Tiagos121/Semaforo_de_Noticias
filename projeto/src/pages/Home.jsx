// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
// CORREÇÃO: Importar AuthContext diretamente de AuthContextValue.js
import { AuthContext } from "../context/AuthContextValue";

// Meteorologia
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao";

// Favoritos (Firebase helpers e hook)
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import { useFavoritos } from "../hooks/useFavoritos";

// Imagem default local (cria src/assets/default-news.jpg)
import defaultImage from "../assets/fundo_sn.png";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";

const MODEL_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Componente Auxiliar para Visualizar o Espectro de Viés
const BiasSpectrum = ({ scores, opinativo = 0,}) => {
    if (!scores || scores.length === 0) return null;

  const esquerda = scores.find(s => s.label === "esquerda")?.score || 0;
  const centro   = scores.find(s => s.label === "centro")?.score || 0;
  const direita  = scores.find(s => s.label === "direita")?.score || 0;

  // normalização CORRETA (sem duplicar direita)
  const total = esquerda + centro + direita || 1;

  const pctEsquerda = (esquerda / total) * 100;
  const pctCentro   = (centro / total) * 100;
  const pctDireita  = (direita / total) * 100;

  // Maior tendência
  const principal = [...scores].sort((a, b) => b.score - a.score)[0];

  let labelPrincipal = "CENTRO";
  let icon = "⚪";
  let colorPrincipal = "#4b5563";

  if (principal.label === "esquerda") {
    labelPrincipal = "ESQUERDA";
    icon = "🔴";
    colorPrincipal = "#dc2626";
  } else if (principal.label === "direita") {
    labelPrincipal = "DIREITA";
    icon = "🔵";
    colorPrincipal = "#2563eb";
  }

  return (
    <div className="bias-analysis mt-3 pt-3" style={{ borderTop: "1px solid #e5e7eb" }}>
      
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, marginTop: "8px"}}>
        <span style={{ fontWeight: 700, color: colorPrincipal }}>
          {icon} {labelPrincipal} ({principal.score.toFixed(1)}%)
        </span>

        <span style={{
          backgroundColor: "#fef3c7",
          color: "#92400e",
          padding: "2px 8px",
          borderRadius: 12,
          fontWeight: 600,
        }}>
          Opinativo: {Math.round(opinativo)}%
        </span>
      </div>

      {/* BARRA SEM ESPAÇOS */}
      <div
        style={{
          width: "100%",
          height: 14,
          display: "flex",
          overflow: "hidden",
          borderRadius: 6,
          border: "1px solid black"
        }}
      >
        {/* ESQUERDA */}
        <div
          style={{
            width: `${pctEsquerda}%`,
            backgroundColor: "#ef4444"
          }}
        ></div>

        {/* CENTRO */}
        <div
          style={{
            width: `${pctCentro}%`,
            backgroundColor: "#d1d5db"
          }}
        ></div>

        {/* DIREITA — percentagem real */}
        <div
          style={{
            width: `${pctDireita}%`,
            backgroundColor: "#3b82f6"
          }}
        ></div>

        {/* RESTO — parte que estava a causar o espaço */}
        <div
          style={{
            flexGrow: 1,
            backgroundColor: "#000"
          }}
        ></div>
      </div>

      {/* Sub-labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#6b7280" }}>
        <span>Esquerda</span>
        <span>Centro</span>
        <span>Direita</span>
      </div>

    </div>
  );
};

export default function Home() {
  // CONTEXTO DE AUTENTICAÇÃO
  const { user } = useContext(AuthContext);

  // Favoritos em tempo real
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
        console.log("Favorito removido via toggleFavorito.");
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
      console.log("Notícia guardada via toggleFavorito.");
    }
  } catch (error) {
    console.error("ERRO CRÍTICO NA FIREBASE:", error); 
    // AGORA EXIBIMOS A MENSAGEM DE ERRO REAL PARA DIAGNOSTICAR:
    alert(`ERRO DE FIREBASE: ${error.message}. Verifique as Permissões.`);
  }
};

  // GNEWS CONFIG - FILTRADO POR POLÍTICA E MAX=3
  const queryTermoPolitica = "política portuguesa OR governo OR eleições";
  const NOTICIAS_API_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(queryTermoPolitica)}&lang=pt&country=pt&max=3&apikey=${GNEWS_API_KEY}`;

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  // Função de Análise de Viés usando LLM (Gemini) - versão completa com schema & retries
  const analisarViés = useCallback(async (texto) => {
    const key = GEMINI_API_KEY;
    if (!key) {
      console.error("A chave GEMINI_API_KEY não está configurada. Não é possível analisar o viés.");
      return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "API Key em falta." } };
    }

    const systemPrompt = `Você é um analista de media especialista em detetar viés político em notícias portuguesas. O seu objetivo é classificar a tendência ideológica do texto e o seu caráter opinativo com base nos seguintes CRITÉIOS OBJETIVOS, adaptados ao contexto político português (esquerda: PS, BE, PCP – foco em igualdade social, direitos laborais, progressismo; direita: PSD, CDS, Chega – foco em mercado livre, segurança, tradição, nacionalismo; centro: equilíbrio sem inclinação clara, como em media públicos como RTP):

1. Linguagem e Tom: Identifique adjetivos, advérbios e se o tom é neutro, emocional/polarizador ou subtilmente enviesado (ex.: "reformas necessárias" pode ser direita se no contexto de cortes sociais; "injustiças sociais" pode ser esquerda).
2. Enquadramento: Verifique se favorece ou critica políticas de esquerda (ex.: elogios a subsídios sociais, diversidade, ambiente) ou de direita (ex.: críticas à burocracia estatal, defesa de fronteiras, valores familiares tradicionais). Seja sensível a viés subtis – não classifique como centro só porque é factual; amplifique inclinações leves nas percentagens.
3. Fontes: Avalie a diversidade e o histórico ideológico das fontes mencionadas ou da fonte principal. Exemplos de viés conhecidos em media portugueses:
    - Esquerda/centro-esquerda: Público (como The Guardian), Diário de Notícias.
    - Direita/centro-direita: Observador, Correio da Manhã, Sol.
    - Centro/neutro: Expresso, Jornal de Notícias, RTP (público).
    Se o texto for neutro, pondere 20-30% do viés da fonte conhecida na classificação final.
4. Caráter: Distinga entre relato de factos (informativo, baixo opinativo) e tentativa de convencer (opinativo, com linguagem persuasiva). Só classifique alto em centro_informativo se não houver viés detetável; caso contrário, distribua para esquerda/direita.

Devolva APENAS um objeto JSON válido. As percentagens ideológicas (esquerda, direita, centro_informativo) devem somar exatamente 100. Seja rigoroso: evite centro alto a menos que o texto seja 100% neutro.`;

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
          const wait = Math.pow(2, i) * 12000;
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
          return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Falha na classificação." } };
        }
        // small backoff
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Timeout" } };
  }, []);

  // 2. Buscar e classificar notícias
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
            vies = { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Erro análise" } };
          }

          artigosComVies.push({
            ...artigo,
            id: artigo.url,
            image: artigo.image || defaultImage,
            vies_label: vies.label,
            vies_score: vies.score,
            detalhes: vies.detalhes
          });

          // evitar limite de requests
          await new Promise((resolve) => setTimeout(resolve, 400));
        } else {
          artigosComVies.push({
            ...artigo,
            id: artigo.url,
            image: artigo.image || defaultImage,
            vies_label: "Sem texto",
            vies_score: "N/A",
            detalhes: {}
          });
        }
      }

      setFeed(artigosComVies);
    } catch (err) {
      console.error("Erro ao carregar ou classificar:", err);
      setError(err.message || "Ocorreu um erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [analisarViés, NOTICIAS_API_URL]);

  useEffect(() => {
    if (fetched) return;
    carregarEClassificarNoticias();
    setFetched(true);
  }, [fetched, carregarEClassificarNoticias]);

  // RENDER
  // RENDER
return (
  <div className="page-container">
    {/* Meteorologia */}
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

        // Sincronização do Viés Guardado
        const favoritoData = favoritos.find(f => f.url === noticia.url);
        let noticiaParaCard = noticia;

        if (favorito && favoritoData && favoritoData.vies) {
          noticiaParaCard = {
            ...noticia,
            detalhes: favoritoData.vies,
          };
        }

        const detalhes = noticiaParaCard.detalhes || {};
        const scores = detalhes.scores_ideologicos || [];

        return (
          <div key={noticia.id} className="news-card" style={{ background: "#fff", padding: 14, borderRadius: 12, border: "1px solid #e6e6e6" }}>
            {/* Imagem com fallback */}
            <div style={{ marginBottom: 10 }}>
              <img
                src={noticia.image || defaultImage}
                alt={noticia.title}
                style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }}
              />
            </div>

            {/* Título e Descrição */}
            <div style={{ flex: 1 }}>
              <h2 className="news-title" style={{ margin: "0 0 6px 0", fontSize: 18 }}>
                <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="news-link" style={{ color: "#111", textDecoration: "none" }}>
                  {noticia.title}
                </a>
              </h2>
              <p className="news-desc" style={{ margin: 0, color: "#4b5563" }}>{noticia.description}</p>
              <p style={{ marginTop: 8, fontSize: 12, color: "#6b7280", marginBottom: 8}}>
                Fonte: {noticia.source?.name || "Desconhecida"}
              </p>
            </div>

            {/* Spectro - Usa os scores do objeto noticiaParaCard */}
            {scores.length > 0 && (
              <BiasSpectrum scores={scores} opinativo={detalhes.opinativo || 0} justificacao={detalhes.justificacao || ""} />
            )}

            {/* Botão de Favorito */}
            {user && (
              <div className="favorito-button-container" style={{ textAlign: "center", paddingTop: 10, marginTop: 10, borderTop: "1px solid #f3f4f6" }}>
                <button
                  onClick={() => toggleFavorito(noticia)}
                  title={favorito ? "Remover favorito" : "Guardar favorito"}
                  className={`favorite-toggle-btn ${favorito ? 'is-favorito' : ''}`}
                >
                  <span role="img" aria-label="favorito">
                    {favorito ? "★" : "☆"}
                  </span>
                  {favorito ? " Guardado" : " Guardar"}
                </button>
              </div>
            )}

            {/* Link para ler a notícia completa */}
            <div style={{ marginTop: 15, textAlign: "center" }}>
              <a 
                href={noticia.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="news-full-link"
              >
                <i className="fas fa-info-circle"></i> Ler notícia completa
              </a>
            </div>

          </div>
        );
      })}
    </div>
  </div>
);
}
