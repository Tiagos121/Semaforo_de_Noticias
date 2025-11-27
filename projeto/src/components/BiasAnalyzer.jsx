// src/components/BiasAnalyzer.jsx
import React, { useState, useEffect } from 'react';
import BiasSpectrum from './BiasSpectrum'; 

// Variáveis da API Gemini (Movidas para aqui)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache

// DADOS DE VIÉS PADRÃO (Fallback se a API falhar)
const DEFAULT_FALLBACK_VIES = {
  opinativo: 0,
  justificacao: "Sem análise (API offline ou falha)",
  scores_ideologicos: [
    { label: "centro", score: 100 },
    { label: "esquerda", score: 0 },
    { label: "direita", score: 0 },
  ],
};


// ------------------------
//     FUNÇÕES AUXILIARES DE CACHE
// ------------------------
function cacheGetLocal(key) {
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

function cacheSetLocal(key, value) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify({ ts: Date.now(), value })
        );
    } catch {
        console.warn("Falha ao escrever no cache local");
    }
}

function safeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// ------------------------
//     FUNÇÃO DE ANÁLISE DE VIÉS (A lógica da Gemini centralizada)
// ------------------------
async function analisarVies(titulo, descricao) {
  // Cria uma chave de cache única para esta notícia (usando base64 para segurança/unicidade)
  const base = titulo.substring(0, 50) + descricao.substring(0, 50);
  const cacheKey = `vies_${safeBase64(base)}`;
  const cached = cacheGetLocal(cacheKey);
  if (cached) return cached;
  
  if (!GEMINI_API_KEY) return DEFAULT_FALLBACK_VIES;

  const prompt = `
    Analise o texto da notícia a seguir para determinar o seu viés ideológico (Esquerda, Centro, Direita) e a sua percentagem de opinatividade (0% a 100%).
    A soma total dos scores de Esquerda, Centro e Direita deve ser 100.
    O resultado deve ser fornecido estritamente em JSON, sem qualquer texto adicional ou formatação Markdown.

    Exemplo de formato JSON esperado:
    {
      "opinativo": 25,
      "justificacao": "Breve justificação da análise.",
      "scores_ideologicos": [
        { "label": "esquerda", "score": 10 },
        { "label": "centro", "score": 70 },
        { "label": "direita", "score": 20 }
      ]
    }

    Texto da Notícia:
    Título: ${titulo}
    Descrição: ${descricao}
  `;

  try {
    const res = await fetch(`${MODEL_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) return DEFAULT_FALLBACK_VIES;

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) return DEFAULT_FALLBACK_VIES;

    const jsonString = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonString);

    cacheSetLocal(cacheKey, parsed);
    return parsed;
    
  } catch (err) {
    console.error("Falha ao processar viés da notícia:", err); 
    return DEFAULT_FALLBACK_VIES;
  }
}

// ------------------------
//     COMPONENTE WRAPPER
// ------------------------
export default function BiasAnalyzer({ titulo, description, existingDetails }) {
    // Se já existirem detalhes (ex: notícias guardadas), usa-os.
    const [detalhes, setDetalhes] = useState(existingDetails || null);
    const [loading, setLoading] = useState(!existingDetails);

    useEffect(() => {
        // Se já tem detalhes, não faz nada
        if (existingDetails) {
            setLoading(false);
            return;
        }
        
        async function runAnalysis() {
            setLoading(true);
            // Executa a análise real para todas as notícias novas (Home e Locais)
            const result = await analisarVies(titulo, description);
            setDetalhes(result);
            setLoading(false);
        }

        runAnalysis();

    // A dependência é importante para reanalisar se a notícia for alterada, 
    // mas essencialmente para garantir que roda uma vez por artigo novo.
    }, [titulo, description, existingDetails]); 

    if (loading) {
        // Placeholder visível enquanto a API está a trabalhar
        return <div style={{ height: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#6b7280', borderTop: '1px solid #f3f4f6', paddingTop: 10, marginTop: 10 }}>A analisar viés...</div>;
    }

    const finalDetalhes = detalhes || DEFAULT_FALLBACK_VIES;
    const scores = finalDetalhes.scores_ideologicos || [];

    // Renderiza o componente visual
    return (
        <BiasSpectrum
          scores={scores}
          opinativo={finalDetalhes.opinativo || 0}
          justificacao={finalDetalhes.justificacao || ""}
        />
    );
}