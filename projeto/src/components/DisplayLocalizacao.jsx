import React from "react";
import { 
    useLocationData, 
    useWeatherForecast, 
    timestampToDate, 
    getIconUrl
} from "./ScriptLocalizacao.jsx";

// Componente de Ícone de Nuvem e Pino de Localização (Font Awesome)
const CloudIcon = ({ style, className }) => <i style={style} className={`fas fa-cloud ${className}`}></i>;
const MapPinIcon = ({ style, className }) => <i style={style} className={`fas fa-map-marker-alt ${className}`}></i>;

// Cores para forçar o tema escuro
const COLORS = {
    BACKGROUND: '#1f2937', // Fundo Principal (bg-gray-800/900)
    CARD_BG: '#374151',    // Fundo dos Cards (bg-gray-700/800)
    TEXT_LIGHT: '#f3f4f6', // Texto Claro
    TEXT_MUTED: '#9ca3af', // Texto Secundário
    INDIGO: '#818cf8',     // Índigo/Roxo para Pinos e Destaques
};

// ====================================================================
// COMPONENTE ÚNICO: Localização + Meteorologia Atual + Previsão Semanal
// ====================================================================
export default function DisplayLocalizacao() {
    const { location, loading: locationLoading, error: locationError } = useLocationData();
    const { forecast, loading: weatherLoading, error: weatherError } = useWeatherForecast(location.lat, location.lon);

    const totalLoading = locationLoading || weatherLoading;
    const currentCity = location.city || "Localização atual"; 

    if (totalLoading)
        return (
            <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', padding: '2rem' }}>
                <p style={{ textAlign: 'center', marginTop: '5rem', color: COLORS.TEXT_LIGHT }}>A carregar localização e meteorologia...</p>
            </div>
        );

    if (locationError || weatherError)
        return (
            <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                <div style={{ backgroundColor: COLORS.CARD_BG, color: COLORS.TEXT_LIGHT, boxShadow: '0 4px 6px rgba(0,0,0,0.3)', borderRadius: '1rem', padding: '2rem', maxWidth: '400px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f87171', marginBottom: '1rem' }}>Erro de Carregamento</h1>
                    <p style={{ marginBottom: '0.5rem' }}>{locationError || weatherError}</p>
                    <p style={{ fontSize: '0.75rem', color: COLORS.TEXT_MUTED, marginTop: '1rem' }}>
                        Verifique a permissão de geolocalização e as chaves de API.
                    </p>
                </div>
            </div>
        );

    // Estrutura do Layout (Tema Escuro com estilos inline)
    return (
        <div style={{ backgroundColor: COLORS.BACKGROUND, minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', fontFamily: 'sans-serif' }}>
            
            {/* Título Principal */}
            {/* ALTERAÇÃO 1: Largura ajustada para ser mais responsiva e ocupar mais espaço */}
            <div style={{ marginBottom: '2rem', width: '95%', maxWidth: '900px', textAlign: 'left', color: COLORS.TEXT_LIGHT, }}>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 300, marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    Previsão de Tempo
                </h1>
                <p style={{ fontSize: '1.125rem', color: COLORS.INDIGO, marginBottom: '2rem', display: 'flex', alignItems: 'center', textAlign: 'left' }}>
                    <MapPinIcon style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: COLORS.INDIGO }} />
                     {currentCity}
                </p>
            </div>
            
            {/* ALTERAÇÃO 1: Container de conteúdo principal mais largo e centrado */}
            <div style={{ width: '95%', maxWidth: '900px', textAlign: 'center', 
                          backgroundColor: COLORS.CARD_BG, padding: '2rem', borderRadius: '1rem', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid #475569'}}>
                
                {/* Meteorologia Atual (Centralizada) */}
                {forecast?.current ? (
                    // ALTERAÇÃO 2: Layout Horizontal (row) e centralizado verticalmente
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: '2.5rem' }}>
                         
                         {/* Ícone e Temperatura Atual no Centro */}
                         <div style={{ display: 'flex', alignItems: 'center', marginRight: '2rem' }}>
                            {/* Ícone da Temperatura Atual */}
                            <i 
                                className={`${getIconUrl(forecast.current.icon)}`}
                                style={{ width: '5rem', height: '5rem', filter: 'invert(100%)', color: COLORS.TEXT_LIGHT }}
                            ></i>
                            
                            {/* Temperatura */}
                             <p
                                style={{ fontSize: '3rem', fontWeight: 'bold', color: COLORS.TEXT_LIGHT, lineHeight: 1, marginLeft: '1rem' }}
                            >
                                {forecast.current.temp}°C
                            </p>
                        </div>
                        
                        {/* Descrição e Data (Movido para a direita) */}
                         <div style={{ textAlign: 'left', color: COLORS.TEXT_MUTED }}>
                            <p style={{ fontSize: '1.125rem', textTransform: 'capitalize' }}>{forecast.current.description}</p>
                            <p style={{ fontSize: '0.875rem' }}>
                                {timestampToDate(Date.now() / 1000).toLocaleDateString("pt-PT", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                })}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: COLORS.TEXT_MUTED, marginBottom: '1rem' }}>Sem dados meteorológicos disponíveis.</p>
                )}

                {/* Previsão Semanal - Grelha de Cards */}
                {forecast?.daily ? (
                    <div style={{ marginTop: '2rem' }}>
                        {/* Grelha responsiva para os 7 dias */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
                            {forecast.daily.map((day, index) => (
                                <div
                                    key={day.dt}
                                    // Estilo de Card Forçado
                                    style={{ 
                                        padding: '1rem', 
                                        backgroundColor: COLORS.BACKGROUND, // Usar o fundo principal para contraste
                                        color: COLORS.TEXT_LIGHT, 
                                        borderRadius: '0.5rem', 
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center',
                                        transition: 'transform 0.2s',
                                        border: '1px solid #475569' 
                                    }}
                                >
                                    {/* Nome do Dia */}
                                    <p style={{ fontSize: '0.875rem', fontWeight: 'medium', marginBottom: '0.5rem', color: COLORS.TEXT_MUTED }}>
                                        {index === 0
                                            ? "Hoje"
                                            : timestampToDate(day.dt).toLocaleDateString("en-US", { 
                                                  weekday: "long",
                                              }).slice(0, 3)}
                                    </p>
                                    
                                    {/* Ícone */}
                                    <i
                                        className={`${getIconUrl(day.weather[0].icon)}`}
                                        style={{ width: '2.5rem', height: '2.5rem', filter: 'invert(100%)', color: COLORS.TEXT_LIGHT, marginBottom: '0.25rem' }}
                                    ></i>
                                    
                                    {/* Temperaturas Máxima | Mínima */}
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: COLORS.TEXT_LIGHT, marginTop: '0.25rem' }}>
                                        {Math.round(day.temp.min)}° | {Math.round(day.temp.max)}°
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p style={{ color: COLORS.TEXT_MUTED, marginTop: '2rem' }}>Sem previsão semanal disponível.</p>
                )}
            </div>
        </div>
    );
}