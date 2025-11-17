import React, { useState, useEffect, useCallback } from "react";

// --- DEFINIÇÕES DE CONSTANTES (MANTENDO O FORMATO VITE) ---
// O compilador está a emitir avisos sobre import.meta, mas é o formato React/Vite.
const MODEL_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";


export default function FeedNoticias() {
    // Obter chaves de ambiente dentro do componente (onde o contexto é local)
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 
    const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY;
    
    // URL da API de Notícias (completo)
    const NOTICIAS_API_URL = `https://gnews.io/api/v4/top-headlines?lang=pt&country=pt&max=5&apikey=${GNEWS_API_KEY}`; 


    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fetched, setFetched] = useState(false); 

    // Função de Análise de Viés usando LLM (Gemini)
    const analisarViés = useCallback(async (texto) => {
        // Obter a chave de ambiente dentro do useCallback
        const key = GEMINI_API_KEY;
        
        if (!key) {
             throw new Error("A chave GEMINI_API_KEY não está configurada. Não é possível analisar o viés.");
        }
        
        // --- PROMPT E CRITÉRIOS DE ANÁLISE DETALHADOS ---
        const systemPrompt = `Você é um analista de media especialista em detetar viés político em notícias portuguesas. O seu objetivo é classificar a tendência ideológica do texto e o seu caráter opinativo com base nos seguintes CRITÉRIOS OBJETIVOS, adaptados ao contexto político português (esquerda: PS, BE, PCP – foco em igualdade social, direitos laborais, progressismo; direita: PSD, CDS, Chega – foco em mercado livre, segurança, tradição, nacionalismo; centro: equilíbrio sem inclinação clara, como em media públicos como RTP):

        1. Linguagem e Tom: Identifique adjetivos, advérbios e se o tom é neutro, emocional/polarizador ou subtilmente enviesado (ex.: "reformas necessárias" pode ser direita se no contexto de cortes sociais; "injustiças sociais" pode ser esquerda).
        2. Enquadramento: Verifique se favorece ou critica políticas de esquerda (ex.: elogios a subsídios sociais, diversidade, ambiente) ou de direita (ex.: críticas à burocracia estatal, defesa de fronteiras, valores familiares tradicionais). Seja sensível a viés subtis – não classifique como centro só porque é factual; amplifique inclinações leves nas percentagens.
        3. Fontes: Avalie a diversidade e o histórico ideológico das fontes mencionadas ou da fonte principal. Exemplos de viés conhecidos em media portugueses: 
           - Esquerda/centro-esquerda: Público (como The Guardian), Diário de Notícias.
           - Direita/centro-direita: Observador, Correio da Manhã, Sol.
           - Centro/neutro: Expresso, Jornal de Notícias, RTP (público). 
           Se o texto for neutro, pondere 20-30% do viés da fonte conhecida na classificação final.
        4. Caráter: Distinga entre relato de factos (informativo, baixo opinativo) e tentativa de convencer (opinativo, com linguagem persuasiva). Só classifique alto em centro_informativo se não houver viés detetável; caso contrário, distribua para esquerda/direita.

        Exemplos de classificação:
        - Texto: "Governo aprova aumento do salário mínimo, combatendo desigualdades." -> esquerda_percent: 70, direita_percent: 10, centro_informativo_percent: 20, caracter_opinativo_percent: 30 (enquadramento favorece políticas sociais de esquerda).
        - Texto: "Imigração descontrolada ameaça segurança nacional." -> esquerda_percent: 5, direita_percent: 80, centro_informativo_percent: 15, caracter_opinativo_percent: 60 (tom polarizador, alinhado com direita).
        - Texto: "Inflação sobe 2% em outubro, segundo INE." -> esquerda_percent: 0, direita_percent: 0, centro_informativo_percent: 100, caracter_opinativo_percent: 0 (puramente factual, sem enquadramento).

        Devolva APENAS um objeto JSON válido. As percentagens ideológicas (esquerda, direita, centro_informativo) devem somar exatamente 100. Seja rigoroso: evite centro alto a menos que o texto seja 100% neutro.`;
        
        // Texto original é um objeto com title, description, content e source
        const userQuery = `Analise o seguinte texto (Fonte: ${texto.source?.name} - ${texto.source?.url ? new URL(texto.source.url).hostname : 'Desconhecido'}): "${texto.title} - ${texto.description} - ${texto.content || 'Sem conteúdo adicional'}"`;
        
        // --- ESTRUTURA DE RESPOSTA JSON (COM TODOS OS CAMPOS SOLICITADOS) ---
        const responseSchema = {
            type: "OBJECT",
            properties: {
                esquerda_percent: { 
                    type: "NUMBER", 
                    description: "Tendência para a esquerda (0-100). Soma com direita e centro/informativo deve ser 100." 
                },
                direita_percent: { 
                    type: "NUMBER", 
                    description: "Tendência para a direita (0-100). Soma com esquerda e centro/informativo deve ser 100." 
                },
                centro_informativo_percent: { 
                    type: "NUMBER", 
                    description: "Tendência neutra/informativa (0-100). Soma com esquerda e direita deve ser 100." 
                },
                caracter_opinativo_percent: { 
                    type: "NUMBER", 
                    description: "O quão opinativo é o texto (0-100). 0 é puramente factual." 
                },
                justificacao_curta: {
                    type: "STRING",
                    description: "Explicação concisa (máximo 3 frases) da classificação com base nos critérios de análise."
                }
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
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    throw new Error(`Status ${res.status}`);
                }
                
                const result = await res.json();
                
                const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (jsonText) {
                    const parsedJson = JSON.parse(jsonText);

                    // Valida e normaliza as percentagens ideológicas
                    let total = (parsedJson.esquerda_percent || 0) + (parsedJson.direita_percent || 0) + (parsedJson.centro_informativo_percent || 0);
                    if (total !== 100 && total > 0) {
                        parsedJson.esquerda_percent = Math.round((parsedJson.esquerda_percent / total) * 100);
                        parsedJson.direita_percent = Math.round((parsedJson.direita_percent / total) * 100);
                        parsedJson.centro_informativo_percent = 100 - parsedJson.esquerda_percent - parsedJson.direita_percent;
                    }

                    // Valida e formata o resultado
                    // O LLM devolve as percentagens. Usamos a maior para a label principal.
                    const scores = [
                        { label: 'esquerda', score: parsedJson.esquerda_percent || 0 },
                        { label: 'direita', score: parsedJson.direita_percent || 0 },
                        { label: 'centro', score: parsedJson.centro_informativo_percent || 0 },
                    ].sort((a, b) => b.score - a.score);

                    return {
                        label: scores[0].label,
                        score: scores[0].score.toFixed(1),
                        detalhes: {
                            opinativo: parsedJson.caracter_opinativo_percent || 0,
                            justificacao: parsedJson.justificacao_curta || 'Análise falhou ou é muito breve.',
                            scores_ideologicos: scores // Para ser usado no detalhe do front-end
                        }
                    };
                }
            } catch (e) {
                if (i === MAX_TRIES - 1) {
                    throw new Error(`Falha na chamada Gemini: ${e.message}`);
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Falha na classificação." } };
    }, [GEMINI_API_KEY]); 


    const carregarEClassificarNoticias = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // PASSO 1: Obter Notícias da API
            const noticiasRes = await fetch(NOTICIAS_API_URL);
            const noticiasData = await noticiasRes.json();

            if (noticiasData.errors || !noticiasData.articles) {
                 throw new Error("Erro na GNews API: " + JSON.stringify(noticiasData.errors || noticiasData));
            }
            
            // PASSO 2: Loop Sequencial e Análise de Viés 
            const artigosComVies = [];

            for (const artigo of noticiasData.articles) {
                const textoParaAnalise = {
                    title: artigo.title,
                    description: artigo.description,
                    content: artigo.content,
                    source: artigo.source
                };
                
                if (artigo.title) {
                    const vies = await analisarViés(textoParaAnalise);
                    artigosComVies.push({ 
                        ...artigo, 
                        vies_label: vies.label, 
                        vies_score: vies.score,
                        detalhes: vies.detalhes
                    });
                    
                    // Buffer entre chamadas de IA
                    await new Promise(resolve => setTimeout(resolve, 500)); // Buffer de 500ms
                } else {
                    artigosComVies.push({ ...artigo, vies_label: "Sem texto", vies_score: "N/A", detalhes: {} });
                }
            }
            
            setFeed(artigosComVies);

        } catch (err) {
            console.error("Erro ao carregar ou classificar:", err);
            setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setLoading(false);
        }
    }, [analisarViés]); 

    // Bloco useEffect
    useEffect(() => {
        if (fetched) return; 

        const fetchData = async () => {
            await carregarEClassificarNoticias();
            setFetched(true); 
        };
        fetchData();
        
    }, [fetched, carregarEClassificarNoticias]); 

    // PASSO 4: Renderizar
    return (
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-inter">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Semáforo Notícias 🇵🇹</h1>
            <p className="text-gray-600 mb-8">Análise de Viés Político (Esquerda/Centro/Direita) de notícias de Portugal.</p>
            
            {loading && <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-yellow-300">
                <p className="text-lg font-semibold text-gray-700">A carregar notícias e a analisar viés...</p>
                <div className="mt-3 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>}
            
            {error && <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md mb-6">
                <p className="font-bold">Erro Crítico:</p>
                <p className="text-sm">{error}</p>
            </div>}
            
            <div className="space-y-6">
                {feed.map((noticia, index) => {
                    const viesLabel = noticia.vies_label || 'indeterminado';
                    const viesScore = noticia.vies_score || 'N/A';
                    const detalhes = noticia.detalhes || {};

                    // Define a cor e o ícone do semáforo
                    let colorClass, badgeText;
                    if (viesLabel === 'esquerda') {
                        colorClass = 'bg-red-500 text-white';
                        badgeText = 'ESQUERDA 🔴';
                    } else if (viesLabel === 'direita') {
                        colorClass = 'bg-blue-500 text-white';
                        badgeText = 'DIREITA 🔵';
                    } else if (viesLabel === 'centro') {
                        colorClass = 'bg-green-500 text-white';
                        badgeText = 'CENTRO 🟢';
                    } else {
                        colorClass = 'bg-gray-400 text-gray-800';
                        badgeText = 'INDETERMINADO ⚪';
                    }

                    return (
                        <div key={index} className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition duration-300">
                            <h2 className="text-xl font-bold mb-2">
                                <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 transition">
                                    {noticia.title}
                                </a>
                            </h2>
                            <p className="text-gray-700 mb-3 text-sm italic">{noticia.description}</p>
                            
                            <div className="flex flex-wrap items-center space-x-3 mt-4 pt-3 border-t border-gray-100">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                                    {badgeText} ({viesScore}%)
                                </span>
                                
                                {detalhes.opinativo !== undefined && (
                                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                        Opinião: {detalhes.opinativo}%
                                    </span>
                                )}

                                <span className="text-xs text-gray-500">Fonte: {noticia.source.name}</span>
                            </div>

                            {detalhes.justificacao && (
                                <div className="mt-3 p-3 bg-gray-50 border-l-4 border-gray-300 text-sm text-gray-600">
                                    <p className="font-semibold">Justificação:</p>
                                    <p>{detalhes.justificacao}</p>
                                </div>
                            )}

                             {detalhes.scores_ideologicos && (
                                <div className="mt-3 p-3 bg-gray-50 border-l-4 border-gray-300 text-sm text-gray-600">
                                    <p className="font-semibold mb-1">Distribuição de Viés:</p>
                                    <div className="flex flex-col space-y-1">
                                        {detalhes.scores_ideologicos.map((score, idx) => (
                                            <div key={idx} className="flex items-center space-x-2">
                                                <span className={`w-20 text-xs font-medium ${score.label === 'esquerda' ? 'text-red-500' : score.label === 'direita' ? 'text-blue-500' : 'text-green-500'}`}>
                                                    {score.label.toUpperCase()}:
                                                </span>
                                                <div className="flex-1 h-3 rounded-full bg-gray-200">
                                                    <div
                                                        className={`h-full rounded-full ${score.label === 'esquerda' ? 'bg-red-500' : score.label === 'direita' ? 'bg-blue-500' : 'bg-green-500'}`}
                                                        style={{ width: `${score.score}%` }}
                                                    ></div>
                                                </div>
                                                <span className="w-8 text-xs font-medium text-gray-700">{score.score.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}