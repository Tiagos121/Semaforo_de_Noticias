import React, { useState, useEffect, useCallback, useContext } from "react";

// --- HOOKS & COMPONENTES EXTERNOS ---
import { AuthContext } from "../context/AuthContextValue";
import { useFavoritos } from "../hooks/useFavoritos";
import { useLocationData } from "../hooks/useWeatherAndLocation";
import DisplayLocalizacao from "../components/tempo_local/DisplayLocalizacao";
import BiasSpectrum from "../components/BiasSpectrum";
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";

// --- CONFIGURAÇÃO DE APIS ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || "";
const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || "";

const MODEL_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const LOCATIONIQ_URL = "https://us1.locationiq.com/v1/reverse.php";
const defaultImage = "https://placehold.co/400x160/2563eb/ffffff?text=Sem+Imagem";

// Número de notícias a buscar
const MAX_NOTICIAS = 3;

export default function LocalFeed() {
    // Dependências de contexto
    const { user } = useContext(AuthContext);
    const favoritos = useFavoritos();
    const isFavorito = (url) => favoritos.some((f) => f.url === url);

    // --- HOOK DE LOCALIZAÇÃO ---
    const { location, loading: locationLoading } = useLocationData();

    // --- ESTADO GERAL ---
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locationHierarchy, setLocationHierarchy] = useState(null);

    // --- FUNÇÃO PARA OBTER HIERARQUIA GEOGRÁFICA (Freguesia, Concelho, Distrito) ---
    const obterHierarquiaGeografica = useCallback(async (lat, lon) => {
        if (!LOCATIONIQ_API_KEY || LOCATIONIQ_API_KEY === "YOUR_LOCATIONIQ_KEY") {
            // Fallback: retorna apenas cidade genérica
            return {
                freguesia: null,
                concelho: null,
                distrito: null,
                cidade: location.city || "Portugal",
                pais: "Portugal"
            };
        }

        try {
            const url = `${LOCATIONIQ_URL}?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
            const res = await fetch(url);
            
            if (!res.ok) {
                throw new Error(`LocationIQ HTTP error! Status: ${res.status}`);
            }

            const data = await res.json();
            
            if (data.address) {
                const addr = data.address;
                
                // Extração mais robusta dos dados geográficos
                // LocationIQ pode retornar diferentes campos dependendo da localização
                const freguesia = addr.neighbourhood || 
                                 addr.suburb || 
                                 addr.village || 
                                 addr.city_district ||
                                 addr.quarter ||
                                 null;
                
                const concelho = addr.municipality || 
                               addr.county || 
                               addr.city_district ||
                               addr.state_district ||
                               null;
                
                const distrito = addr.state || 
                               addr.region || 
                               addr.state_district ||
                               null;
                
                const cidade = addr.city || 
                              addr.town || 
                              addr.village ||
                              addr.municipality ||
                              location.city ||
                              "Portugal";
                
                return {
                    freguesia,
                    concelho,
                    distrito,
                    cidade,
                    pais: addr.country || "Portugal"
                };
            }
        } catch (e) {
            console.error("Erro ao obter hierarquia geográfica:", e);
        }

        // Fallback em caso de erro
        return {
            freguesia: null,
            concelho: null,
            distrito: null,
            cidade: location.city || "Portugal",
            pais: "Portugal"
        };
    }, [location.city]);

    // --- FUNÇÃO DE ANÁLISE DE VIÉS (Gemini) ---
    const analisarViés = useCallback(async (texto) => {
        const key = GEMINI_API_KEY;
        if (!key) throw new Error("API Key em falta.");

        const systemPrompt = `Você é um analista de media especialista em detetar viés político em notícias portuguesas. O seu objetivo é classificar a tendência ideológica do texto e o seu caráter opinativo com base em critérios rigorosos. Responda APENAS com JSON. As percentagens ideológicas (esquerda, direita, centro_informativo) devem somar 100. Seja rigoroso: evite centro alto a menos que o texto seja 100% neutro.`;
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
                    await new Promise((r) => setTimeout(r, Math.pow(2, i) * 5000));
                    continue;
                }
                
                if (!res.ok) throw new Error(`Gemini: ${res.status}`);

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
                    return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Falha final na análise de viés." } };
                }
                await new Promise((r) => setTimeout(r, 5000));
            }
        }
        return { label: "indeterminado", score: "N/A", detalhes: { opinativo: 0, justificacao: "Timeout" } };
    }, []);

    // --- FUNÇÃO PARA BUSCAR NOTÍCIAS DE UM NÍVEL GEOGRÁFICO ---
    const buscarNoticiasPorNivel = useCallback(async (termo, nivel, quantidadeNecessaria) => {
        if (!termo || quantidadeNecessaria <= 0) return [];

        // Query mais geral (não específica de política)
        const query = `"${termo}"`;
        const NOTICIAS_API_URL = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=pt&country=pt&max=${quantidadeNecessaria * 2}&apikey=${GNEWS_API_KEY}`;

        try {
            const noticiasRes = await fetch(NOTICIAS_API_URL);
            if (!noticiasRes.ok) {
                if (noticiasRes.status === 429) {
                    throw new Error("GNews: Limite diário atingido.");
                }
                throw new Error(`GNews HTTP: ${noticiasRes.status}`);
            }

            const noticiasData = await noticiasRes.json();
            const lista = noticiasData.articles || [];

            // Retorna as notícias com informação do nível (limitado à quantidade necessária)
            return lista.slice(0, quantidadeNecessaria).map(artigo => ({
                ...artigo,
                nivel_geografico: nivel
            }));
        } catch (err) {
            console.error(`Erro ao buscar notícias para ${termo}:`, err);
            return [];
        }
    }, []);

    // --- FUNÇÃO PRINCIPAL: BUSCAR NOTÍCIAS COM FALLBACK HIERÁRQUICO ---
    const carregarNoticiasComFallback = useCallback(async () => {
        if (!location.lat || !location.lon) {
            setError("Localização não disponível.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Obter hierarquia geográfica
            const hierarquia = await obterHierarquiaGeografica(location.lat, location.lon);
            setLocationHierarchy(hierarquia);

            // 2. Definir níveis de busca (do mais específico ao mais geral)
            const niveis = [];
            
            if (hierarquia.freguesia) {
                niveis.push({ termo: hierarquia.freguesia, nivel: "freguesia" });
            }
            if (hierarquia.concelho) {
                niveis.push({ termo: hierarquia.concelho, nivel: "concelho" });
            }
            if (hierarquia.distrito) {
                niveis.push({ termo: hierarquia.distrito, nivel: "distrito" });
            }
            if (hierarquia.cidade && hierarquia.cidade !== "Portugal") {
                niveis.push({ termo: hierarquia.cidade, nivel: "cidade" });
            }
            // Último recurso: país
            niveis.push({ termo: "Portugal", nivel: "país" });

            // 3. Buscar notícias por nível até preencher MAX_NOTICIAS
            const todasNoticias = [];

            for (const { termo, nivel } of niveis) {
                const quantidadeNecessaria = MAX_NOTICIAS - todasNoticias.length;
                if (quantidadeNecessaria <= 0) break;

                const noticiasNivel = await buscarNoticiasPorNivel(termo, nivel, quantidadeNecessaria);
                
                // Adiciona notícias que ainda não foram processadas (evita duplicados)
                for (const noticia of noticiasNivel) {
                    if (todasNoticias.length >= MAX_NOTICIAS) break;
                    
                    // Verifica se já existe (por URL)
                    const jaExiste = todasNoticias.some(n => n.url === noticia.url);
                    if (!jaExiste) {
                        todasNoticias.push(noticia);
                    }
                }

                // Se já temos o suficiente, para
                if (todasNoticias.length >= MAX_NOTICIAS) break;

                // Pequeno delay entre requests
                await new Promise((resolve) => setTimeout(resolve, 300));
            }

            if (todasNoticias.length === 0) {
                throw new Error("Nenhuma notícia encontrada para a localização.");
            }

            // 4. Analisar viés de cada notícia
            const artigosComVies = [];
            for (const artigo of todasNoticias.slice(0, MAX_NOTICIAS)) {
                const textoParaAnalise = {
                    title: artigo.title,
                    description: artigo.description,
                    content: artigo.content,
                    source: artigo.source
                };

                let vies = null;
                try {
                    vies = await analisarViés(textoParaAnalise);
                } catch {
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

                // Buffer entre análises
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            setFeed(artigosComVies);
        } catch (err) {
            console.error("Erro no fetch ou classificação:", err);
            setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setLoading(false);
        }
    }, [location.lat, location.lon, obterHierarquiaGeografica, buscarNoticiasPorNivel, analisarViés]);

    // --- EFEITO PRINCIPAL: Obtém a localização e inicia a pesquisa ---
    useEffect(() => {
        if (locationLoading || !location.lat || !location.lon || feed.length > 0) return;
        carregarNoticiasComFallback();
    }, [location.lat, location.lon, locationLoading, carregarNoticiasComFallback, feed.length]);

    // --- TOGGLE FAVORITO ---
    const toggleFavorito = async (noticia) => {
        if (!user) {
            alert("Precisas de fazer login para guardar favoritos.");
            return;
        }

        try {
            if (isFavorito(noticia.url)) {
                const fav = favoritos.find((f) => f.url === noticia.url);
                if (fav?.id) await removerFavorito(fav.id);
            } else {
                await adicionarFavorito(user.uid, {
                    url: noticia.url,
                    title: noticia.title,
                    description: noticia.description,
                    image: noticia.image || defaultImage,
                    source: noticia.source || {},
                    vies: noticia.detalhes || null
                });
            }
        } catch (error) {
            console.error("ERRO FIREBASE:", error);
        }
    };

    // --- RENDER ---
    const getNivelLabel = (nivel) => {
        const labels = {
            freguesia: "Freguesia",
            concelho: "Concelho",
            distrito: "Distrito",
            cidade: "Cidade",
            país: "País"
        };
        return labels[nivel] || nivel;
    };

    return (
        <div className="page-container">
            {/* Meteorologia (Localização) */}
            <div style={{ marginBottom: 18 }}>
                <DisplayLocalizacao />
            </div>

            <h1 className="page-title" style={{ backgroundColor: "rgb(34, 197, 94)", color: 'white', padding: '10px', textAlign: 'center' }}>
                📰 Notícias Locais & Análise de Viés
            </h1>

            {locationHierarchy && (
                <div style={{ padding: 12, background: "#f0f4ff", borderRadius: 8, marginBottom: 12, fontSize: 14, color: "#1e3a8a" }}>
                    <strong>Localização:</strong> {
                        [locationHierarchy.freguesia, locationHierarchy.concelho, locationHierarchy.distrito, locationHierarchy.cidade]
                            .filter(Boolean)
                            .join(" → ") || locationHierarchy.cidade
                    }
                </div>
            )}

            {loading && (
                <div style={{ padding: 12, background: "#fff", borderRadius: 8, marginBottom: 12, color: "#374151" }}>
                    <strong>A carregar notícias e a analisar viés...</strong>
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
                    const detalhes = noticia.detalhes || favoritoData?.vies || {};
                    const scores = detalhes.scores_ideologicos || [];
                    const opinativo = detalhes.opinativo || 0;

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
                                <p style={{ marginTop: 8, fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                                    Fonte: {noticia.source?.name || "Desconhecida"}
                                </p>
                                
                                {/* Tag do nível geográfico */}
                                {noticia.nivel_geografico && (
                                    <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, color: "#059669", backgroundColor: "#d1fae5", padding: "2px 8px", borderRadius: 4 }}>
                                        📍 {getNivelLabel(noticia.nivel_geografico)}
                                    </span>
                                )}
                            </div>

                            {/* Spectro */}
                            {scores.length > 0 && (
                                <BiasSpectrum scores={scores} opinativo={opinativo} justificacao={detalhes.justificacao || ""} />
                            )}

                            {/* Botão de Favorito */}
                            {user && (
                                <div className="favorito-button-container" style={{ textAlign: "center", paddingTop: 10, marginTop: 10, borderTop: "1px solid #f3f4f6" }}>
                                    <button
                                        onClick={() => toggleFavorito(noticia)}
                                        title={favorito ? "Remover favorito" : "Guardar favorito"}
                                        className={`favorite-toggle-btn ${favorito ? 'is-favorito' : ''}`}
                                        style={{ border: "1px solid #3b82f6", backgroundColor: favorito ? "#3b82f6" : "transparent", color: favorito ? "white" : "#3b82f6", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}
                                    >
                                        <span role="img" aria-label="favorito">
                                            {favorito ? "★" : "☆"}
                                        </span>
                                        {favorito ? " Guardado" : " Guardar"}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
