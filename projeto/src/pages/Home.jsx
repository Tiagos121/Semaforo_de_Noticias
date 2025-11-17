// src/pages/Home.jsx
import { useEffect, useState, useCallback, useContext } from "react";
// CORREÇÃO: Importar AuthContext diretamente de AuthContextValue.js
import { AuthContext } from "../context/AuthContextValue"; 

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY; 

const MODEL_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Componente Auxiliar para Visualizar o Espectro de Viés (Mantido com correções de estilo)
const BiasSpectrum = ({ scores, opinativo, justificacao }) => {
    if (!scores || scores.length === 0) return null;
    
    const esquerda = scores.find(s => s.label === 'esquerda')?.score || 0;
    const direita = scores.find(s => s.label === 'direita')?.score || 0;
    
    const totalPol = esquerda + direita;
    const posicaoNormalizada = totalPol > 0 ? ((direita - esquerda) / totalPol) * 50 : 0; 
    const posicaoEspectro = 50 + (posicaoNormalizada / 100) * 50; 

    const principalScore = scores.sort((a, b) => b.score - a.score)[0];
    let labelPrincipal = '';
    let colorPrincipal = '';
    let icon = '';

    if (principalScore.label === 'esquerda') {
        labelPrincipal = `ESQUERDA`;
        colorPrincipal = '#dc2626'; // Red 600
        icon = '🔴';
    } else if (principalScore.label === 'direita') {
        labelPrincipal = `DIREITA`;
        colorPrincipal = '#2563eb'; // Blue 600
        icon = '🔵';
    } else if (principalScore.label === 'centro') {
        labelPrincipal = `CENTRO`;
        colorPrincipal = '#4b5563'; // Cor para contraste
        icon = '⚪'; // Ícone branco/cinzento
    }
    
    return (
        <div className="bias-analysis mt-3 pt-3" style={{ borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: colorPrincipal }}>
                    {icon} {labelPrincipal} ({principalScore.score.toFixed(1)}%)
                </span>
                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Opinativo: {opinativo.toFixed(0)}%
                </span>
            </div>
            
            <div style={{ position: 'relative', height: '10px', backgroundColor: '#e5e7eb', borderRadius: '5px', marginBottom: '4px' }}>
                <div style={{ height: '100%', position: 'absolute', top: 0, left: 0, width: '50%', backgroundColor: '#ef4444', borderTopLeftRadius: '5px', borderBottomLeftRadius: '5px' }}></div>
                <div style={{ height: '100%', position: 'absolute', top: 0, right: 0, width: '50%', backgroundColor: '#3b82f6', borderTopRightRadius: '5px', borderBottomRightRadius: '5px' }}></div>
                
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '3px', backgroundColor: '#f3f4f6', border: '1px solid #9ca3af', transform: 'translateX(-50%)' }}></div>

                <div
                    style={{ 
                        position: 'absolute', 
                        top: 0, 
                        bottom: 0, 
                        width: '8px', 
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'black', 
                        transform: 'translateX(-50%)',
                        left: `${posicaoEspectro}%`,
                        boxShadow: '0 0 3px rgba(0,0,0,0.8)',
                        transition: 'left 0.7s ease'
                    }}
                ></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
                <span>Esquerda</span>
                <span>Direita</span>
            </div>

            {justificacao && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f9fafb', borderLeft: '3px solid #d1d5db', color: '#4b5563', fontSize: '12px' }}>
                    <p style={{ fontWeight: 600, marginBottom: '2px' }}>Justificação da IA:</p>
                    <p>{justificacao}</p>
                </div>
            )}
        </div>
    );
};


export default function Home() {
    // ----------------------------------------------------
    // 0. CONTEXTO DE AUTENTICAÇÃO
    // ----------------------------------------------------
    // Contexto obtido do AuthContextValue
    const { user } = useContext(AuthContext); 
    const isAuthenticated = !!user; 

    // ----------------------------------------------------
    // GNEWS CONFIG - FILTRADO POR POLÍTICA E MAX=3
    // ----------------------------------------------------
    const queryTermoPolitica = "política portuguesa OR governo OR eleições"; 
    const NOTICIAS_API_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(queryTermoPolitica)}&lang=pt&country=pt&max=3&apikey=${GNEWS_API_KEY}`; 

    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fetched, setFetched] = useState(false); 

    // ----------------------------------------------------
    // 1. Função de Análise de Viés AVANÇADA (Prompt completo)
    // ----------------------------------------------------
    const analisarViés = useCallback(async (texto) => {
        const key = GEMINI_API_KEY;
        if (!key) {
             console.error("A chave GEMINI_API_KEY não está configurada.");
             return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "API Key em falta." } };
        }
        
        // PROMPT COMPLETO REINSERIDO AQUI:
        const systemPrompt = `Você é um analista de media especialista em detetar viés político em notícias portuguesas. O seu objetivo é classificar a tendência ideológica do texto e o seu caráter opinativo com base nos seguintes CRITÉRIOS OBJETIVOS, adaptados ao contexto político português (esquerda: PS, BE, PCP – foco em igualdade social, direitos laborais, progressismo; direita: PSD, CDS, Chega – foco em mercado livre, segurança, tradição, nacionalismo; centro: equilíbrio sem inclinação clara, como em media públicos como RTP):

        1. Linguagem e Tom: Identifique adjetivos, advérbios e se o tom é neutro, emocional/polarizador ou subtilmente enviesado (ex.: "reformas necessárias" pode ser direita se no contexto de cortes sociais; "injustiças sociais" pode ser esquerda).
        2. Enquadramento: Verifique se favorece ou critica políticas de esquerda (ex.: elogios a subsídios sociais, diversidade, ambiente) ou de direita (ex.: críticas à burocracia estatal, defesa de fronteiras, valores familiares tradicionais). Seja sensível a viés subtis – não classifique como centro só porque é factual; amplifique inclinações leves nas percentagens.
        3. Fontes: Avalie a diversidade e o histórico ideológico das fontes mencionadas ou da fonte principal. Exemplos de viés conhecidos em media portugueses: 
            - Esquerda/centro-esquerda: Público (como The Guardian), Diário de Notícias.
            - Direita/centro-direita: Observador, Correio da Manhã, Sol.
            - Centro/neutro: Expresso, Jornal de Notícias, RTP (público). 
            Se o texto for neutro, pondere 20-30% do viés da fonte conhecida na classificação final.
        4. Caráter: Distinga entre relato de factos (informativo, baixo opinativo) e tentativa de convencer (opinativo, com linguagem persuasiva). Só classifique alto em centro_informativo se não houver viés detetável; caso contrário, distribua para esquerda/direita.

        Devolva APENAS um objeto JSON válido. As percentagens ideológicas (esquerda, direita, centro_informativo) devem somar exatamente 100. Seja rigoroso: evite centro alto a menos que o texto seja 100% neutro.`;
        
        const userQuery = `Analise o seguinte texto (Fonte: ${texto.source?.name}): "${texto.title} - ${texto.description} - ${texto.content || 'Sem conteúdo adicional'}"`;
        
        const responseSchema = {
            type: "OBJECT",
            properties: {
                esquerda_percent: { type: "NUMBER" },
                direita_percent: { type: "NUMBER" },
                centro_informativo_percent: { type: "NUMBER" },
                caracter_opinativo_percent: { type: "NUMBER" },
                justificacao_curta: { type: "STRING" }
            }
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
        
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.warn(`Gemini Falhou com status: ${res.status}`);
                throw new Error(`Gemini: ${res.status}`);
            }
            
            const result = await res.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (jsonText) {
                const parsedJson = JSON.parse(jsonText);

                // Normalização de Scores 
                let total = (parsedJson.esquerda_percent || 0) + (parsedJson.direita_percent || 0) + (parsedJson.centro_informativo_percent || 0);
                if (total === 0) total = 100;

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
            console.error("Falha na chamada Gemini:", e);
        }
        return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Falha na classificação/timeout." } };
    }, [GEMINI_API_KEY]); 
    
    // ----------------------------------------------------
    // 2. Função para buscar notícias GNews e classificar
    // ----------------------------------------------------
    const carregarEClassificarNoticias = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const noticiasRes = await fetch(NOTICIAS_API_URL);
            if (!noticiasRes.ok) throw new Error(`GNews: ${noticiasRes.status}`);
            const noticiasData = await noticiasRes.json();
            if (!noticiasData.articles || noticiasData.articles.length === 0) throw new Error("Nenhuma notícia encontrada.");
            const artigosComVies = [];
            const lista = noticiasData.articles;
            for (const artigo of lista) {
                const textoParaAnalise = { title: artigo.title, description: artigo.description, content: artigo.content, source: artigo.source };
                if (artigo.title) {
                    const vies = await analisarViés(textoParaAnalise);
                    artigosComVies.push({ ...artigo, id: artigo.url, vies_label: vies.label, vies_score: vies.score, detalhes: vies.detalhes });
                    // Mantendo o atraso de 400ms
                    await new Promise(resolve => setTimeout(resolve, 400)); 
                } else {
                    artigosComVies.push({ ...artigo, id: artigo.url, vies_label: "Sem texto", vies_score: "N/A", detalhes: {} });
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


    // ----------------------------------------------------
    // 3. Renderização no layout do seu Card
    // ----------------------------------------------------
    return (
        <div className="page-container">
            <h1 className="page-title">📰 Notícias de Política & Análise de Viés</h1>

            {loading && <p className="placeholder">A carregar e analisar notícias...</p>}
            {error && <p className="placeholder" style={{ color: "red" }}>{error}</p>}
            
            <div className="news-grid"> 
                {feed.map((noticia) => {
                    const detalhes = noticia.detalhes || {};

                    return (
                        <div key={noticia.id} className="news-card">
                            
                            {noticia.image && (
                                <img 
                                    src={noticia.image} 
                                    alt={noticia.title} 
                                    style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} 
                                />
                            )}
                            
                            <h2 className="news-title">
                                <a href={noticia.url} target="_blank" rel="noopener noreferrer" className="news-link" style={{ marginBottom: '4px', display: 'block' }}>
                                    {noticia.title}
                                </a>
                            </h2>
                            <p className="news-desc">{noticia.description}</p>
                            
                            <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Fonte: {noticia.source.name}</p>

                            {noticia.vies_score !== 'N/A' && (
                                <BiasSpectrum 
                                    scores={detalhes.scores_ideologicos} 
                                    opinativo={detalhes.opinativo}
                                    justificacao={detalhes.justificacao}
                                />
                            )}

                             {/* Botão de Guardar SÓ APARECE SE ESTIVER AUTENTICADO */}
                             {isAuthenticated && (
                                <button 
                                    className="save-btn" 
                                    style={{ marginTop: '15px' }} 
                                >
                                    Guardar
                                </button>
                             )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}