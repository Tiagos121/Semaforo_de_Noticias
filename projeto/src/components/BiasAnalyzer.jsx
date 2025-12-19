// src/components/BiasAnalyzer.jsx
import React, { useState, useEffect } from 'react';
import BiasSpectrum from './BiasSpectrum'; 

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; 
const MAX_CONCURRENT_REQUESTS = 1;
let activeRequests = 0;
const requestQueue = [];

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) return;

  const { resolve, reject, task } = requestQueue.shift();
  activeRequests++;

  try {
    const result = await task();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    setTimeout(() => processQueue(), 500);
  }
}

async function queueRequest(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, task });
    processQueue();
  });
}

const DEFAULT_FALLBACK_VIES = {
  opinativo: 0,
  justificacao: "Sem análise (API offline ou falha)",
  scores_ideologicos: [
    { label: "centro", score: 100 },
    { label: "esquerda", score: 0 },
    { label: "direita", score: 0 },
  ],
};

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
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {
    console.warn("Falha ao escrever no cache local");
  }
}

function safeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function analisarVies(titulo, descricao) {
  const base = titulo.substring(0, 50) + descricao.substring(0, 50);
  const cacheKey = `vies_${safeBase64(base)}`;
  const cached = cacheGetLocal(cacheKey);
  if (cached) return cached;

  if (!GEMINI_API_KEY) return DEFAULT_FALLBACK_VIES;

  // Mantém exatamente o teu prompt original sem alterações
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
    const res = await queueRequest(async () => {
      return fetch(`${MODEL_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      });
    });

    if (res.status === 429) return DEFAULT_FALLBACK_VIES;
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

export default function BiasAnalyzer({ titulo, description, existingDetails, onAnalysisComplete }) {
  const [detalhes, setDetalhes] = useState(
    existingDetails && Object.keys(existingDetails).length > 0 ? existingDetails : null
  );
  const [loading, setLoading] = useState(!detalhes);

  useEffect(() => {
    if (detalhes) return;

    async function runAnalysis() {
      setLoading(true);
      const result = await analisarVies(titulo, description);
      setDetalhes(result);
      setLoading(false);

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    }

    runAnalysis();
  }, [titulo, description, detalhes, onAnalysisComplete]);

  if (loading) return <div>A analisar viés...</div>;

  const finalDetalhes = detalhes || DEFAULT_FALLBACK_VIES;
  return (
    <BiasSpectrum
      scores={finalDetalhes.scores_ideologicos}
      opinativo={finalDetalhes.opinativo}
      justificacao={finalDetalhes.justificacao}
    />
  );
}