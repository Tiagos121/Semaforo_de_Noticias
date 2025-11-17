import React, { useState, useEffect, useCallback } from "react";

// --- DEFINIÇÕES DE CONSTANTES (PARA LEITURA FORA DO COMPONENTE) ---
// Utiliza a sintaxe VITE padrão (que é o que o seu projeto usa)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY;

const MODEL_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

export default function PoliticaNoticias() {
    
    // CORREÇÃO GNEWS: Simplificamos a query para evitar o erro 400 (Bad Request)
    const simplerQueryTerms = "política portuguesa OR governo OR eleições";
    
    // URL da API de Notícias filtrada (agora só para temas políticos)
    const NOTICIAS_API_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(simplerQueryTerms)}&lang=pt&country=pt&max=5&apikey=${GNEWS_API_KEY}`; 


    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fetched, setFetched] = useState(false); 

    // Função de Análise de Viés usando LLM (Gemini)
    const analisarViés = useCallback(async (texto) => {
        const key = GEMINI_API_KEY;
        
        if (!key) {
             throw new Error("A chave GEMINI_API_KEY não está configurada. Não é possível analisar o viés.");
        }
        
        // --- PROMPT E CRITÉRIOS DE ANÁLISE DETALHADOS ---
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
        
        // Enviamos o título, descrição e, se disponível, o conteúdo completo para análise
        const userQuery = `Analise o seguinte texto (Fonte: ${texto.source?.name} - ${texto.source?.url ? new URL(texto.source.url).hostname : 'Desconhecido'}): "${texto.title} - ${texto.description} - ${texto.content || 'Sem conteúdo adicional'}"`;
        
        // --- ESTRUTURA DE RESPOSTA JSON ---
        const responseSchema = {
            type: "OBJECT",
            properties: {
                esquerda_percent: { type: "NUMBER", description: "Tendência para a esquerda (0-100). Soma com direita e centro/informativo deve ser 100." },
                direita_percent: { type: "NUMBER", description: "Tendência para a direita (0-100). Soma com esquerda e centro/informativo deve ser 100." },
                centro_informativo_percent: { type: "NUMBER", description: "Tendência neutra/informativa (0-100). Soma com esquerda e direita deve ser 100." },
                caracter_opinativo_percent: { type: "NUMBER", description: "O quão opinativo é o texto (0-100). 0 é puramente factual." },
                justificacao_curta: { type: "STRING", description: "Explicação concisa (máximo 3 frases) da classificação com base nos critérios de análise." }
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

                if (res.status === 429) { // Trata erro de Rate Limit (Too Many Requests)
                    const wait = Math.pow(2, i) * 12000;
                    console.warn(`Rate limit. Esperando ${wait/1000}s...`);
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }

                if (!res.ok) {
                    throw new Error(`Gemini: ${res.status}`);
                }
                
                const result = await res.json();
                
                const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (jsonText) {
                    const parsedJson = JSON.parse(jsonText);

                    // Normalização para garantir que soma 100
                    let total = (parsedJson.esquerda_percent || 0) + (parsedJson.direita_percent || 0) + (parsedJson.centro_informativo_percent || 0);
                    if (total === 0) total = 100; // Evita divisão por zero

                    // Recalcula as percentagens para somarem exatamente 100
                    const scores = [
                        { label: 'esquerda', score: (parsedJson.esquerda_percent / total) * 100 },
                        { label: 'direita', score: (parsedJson.direita_percent / total) * 100 },
                        { label: 'centro', score: (parsedJson.centro_informativo_percent / total) * 100 },
                    ].sort((a, b) => b.score - a.score);

                    return {
                        label: scores[0].label,
                        score: scores[0].score.toFixed(1),
                        detalhes: {
                            opinativo: parsedJson.caracter_opinativo_percent || 0,
                            justificacao: parsedJson.justificacao_curta || 'Análise falhou ou é muito breve.',
                            scores_ideologicos: scores 
                        }
                    };
                }
            } catch (e) {
                if (i === MAX_TRIES - 1) {
                    throw new Error(`Falha na chamada Gemini: ${e.message}`);
                }
                await new Promise(r => setTimeout(r, 5000));
            }
        }
        return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Falha na classificação." } };
    }, [GEMINI_API_KEY]); 


    const carregarEClassificarNoticias = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const noticiasRes = await fetch(NOTICIAS_API_URL);
            
            // Tratamento de erro 400/429
            if (!noticiasRes.ok) {
                if (noticiasRes.status === 429) throw new Error("GNews: Limite diário atingido. Tenta amanhã.");
                throw new Error(`GNews: ${noticiasRes.status}`);
            }

            const noticiasData = await noticiasRes.json();

            if (!noticiasData.articles || noticiasData.articles.length === 0) {
                 throw new Error("Nenhuma notícia política encontrada com os filtros atuais. A query foi simplificada.");
            }
            
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
                    
                    // Buffer de 500ms para evitar o erro 429
                    await new Promise(resolve => setTimeout(resolve, 500)); 
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
    }, [analisarViés, NOTICIAS_API_URL]); 

    // Bloco useEffect
    useEffect(() => {
        if (fetched) return; 

        const fetchData = async () => {
            await carregarEClassificarNoticias();
            setFetched(true); 
        };
        fetchData();
        
    }, [fetched, carregarEClassificarNoticias]); 

    // Renderizar com uma representação alternativa: um espectro linear 
    return (
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-inter">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Semáforo Notícias Políticas 🇵🇹</h1>
            <p className="text-gray-600 mb-8">Análise de Viés Político em Notícias Relacionadas a Política de Portugal.</p>
            
            {loading && <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-yellow-300">
                <p className="text-lg font-semibold text-gray-700">A carregar notícias políticas e a analisar viés...</p>
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
                    const scores = detalhes.scores_ideologicos || [];

                    // Calcula a posição no espectro de -100 (esquerda) a +100 (direita)
                    const esquerda = scores.find(s => s.label === 'esquerda')?.score || 0;
                    const direita = scores.find(s => s.label === 'direita')?.score || 0;
                    // A posição é calculada excluindo o centro (que não polariza), e normalizando para 100
                    const totalPol = esquerda + direita;
                    const posicaoNormalizada = totalPol > 0 ? (direita - esquerda) / totalPol * 50 : 0; // De -50 (esquerda) a +50 (direita)
                    const posicaoEspectro = 50 + posicaoNormalizada; // Convertido para escala 0-100 para o CSS

                    let labelPrincipal = '';
                    let colorPrincipal = '';
                    if (viesLabel === 'esquerda') {
                        labelPrincipal = 'ESQUERDA 🔴';
                        colorPrincipal = 'text-red-500';
                    } else if (viesLabel === 'direita') {
                        labelPrincipal = 'DIREITA 🔵';
                        colorPrincipal = 'text-blue-500';
                    } else if (viesLabel === 'centro') {
                        labelPrincipal = 'CENTRO 🟢';
                        colorPrincipal = 'text-green-500';
                    } else {
                        labelPrincipal = 'INDETERMINADO ⚪';
                        colorPrincipal = 'text-gray-500';
                    }

                    return (
                        <div key={index} className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition duration-300">
                            <h2 className="text-xl font-bold mb-2">
                                <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 transition">
                                    {noticia.title}
                                </a>
                            </h2>
                            <p className="text-gray-700 mb-3 text-sm italic">{noticia.description}</p>
                            
                            <div className="mt-4 pt-3 border-t border-gray-100">
                                {/* Informação Principal */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-sm font-semibold ${colorPrincipal}`}>
                                        {labelPrincipal} (Viés Principal: {viesScore}%)
                                    </span>
                                    {detalhes.opinativo !== undefined && (
                                        <span className="text-xs font-medium text-yellow-800 bg-yellow-100 px-2 py-1 rounded-full">
                                            Caráter Opinativo: {detalhes.opinativo}%
                                        </span>
                                    )}
                                </div>

                                {/* Espectro linear (Visualização de Viés) */}
                                <div className="mb-4">
                                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full absolute top-0 left-0 rounded-l-full" 
                                            style={{ width: '50%', backgroundColor: '#ef4444' }} /* Vermelho: Esquerda */
                                        ></div>
                                        <div 
                                            className="h-full absolute top-0 right-0 rounded-r-full" 
                                            style={{ width: '50%', backgroundColor: '#3b82f6' }} /* Azul: Direita */
                                        ></div>

                                        {/* Marcador Central (Verde) */}
                                        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-green-500 transform -translate-x-1/2 shadow-lg"></div>

                                        {/* Ponteiro de Avaliação */}
                                        <div
                                            className="absolute top-0 bottom-0 w-3 h-full rounded-full transform -translate-x-1/2 transition-all duration-700"
                                            style={{ 
                                                left: `${posicaoEspectro}%`,
                                                backgroundColor: 'black', // Ponteiro preto
                                                boxShadow: '0 0 5px rgba(0,0,0,0.5)'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                                
                                <span className="text-xs text-gray-500 block mb-3">Fonte original: {noticia.source.name}</span>

                                {detalhes.justificacao && (
                                    <div className="mt-3 p-3 bg-gray-50 border-l-4 border-gray-300 text-sm text-gray-600">
                                        <p className="font-semibold">Justificação da IA:</p>
                                        <p>{detalhes.justificacao}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}