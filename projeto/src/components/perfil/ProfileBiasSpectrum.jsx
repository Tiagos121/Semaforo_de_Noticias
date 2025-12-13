import React from 'react';

export default function ProfileBiasSpectrum({ biasResult, savedCount }) {
    const colors = {
    left: '#ef4444',
    center: '#d1d5db',
    right: '#3b82f6'
    };

    const { scores = [], label = 'Centro', color = 'gray', opinativo = 0 } = biasResult || {};
    
    const left = scores.find(s => s.label === "esquerda")?.score || 0;
    const center = scores.find(s => s.label === "centro")?.score || 0;
    const right = scores.find(s => s.label === "direita")?.score || 0;

    // 🛑 NOVA LÓGICA DE FALLBACK: A análise está vazia se não há favoritos OU se a análise de viés tem 0 scores.
    const isAnalysisEmpty = savedCount === 0 || scores.length === 0;

    // Determina a mensagem com base no estado
    const fallbackMessage = savedCount === 0 
    ? "Guarde notícias para iniciar a análise." 
    : "Análise em falta. Verifique os dados de viés das notícias guardadas."; 


    if (isAnalysisEmpty) {
    return (
    <div style={{ width: '100%', marginTop: '16px' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Viés Pessoal</span>
        <p style={{
        fontSize: '0.875rem', 
        color: '#4b5563', 
        marginTop: '8px', 
        padding: '12px',   
        borderRadius: '12px', 
        backgroundColor: '#f3f4f6', 
        textAlign: 'center',
        width: '100%',
        border: '1px dashed #d1d5db'
        }}>
        {fallbackMessage}
        </p>
    </div>
    );
    }

    // 🛑 O código abaixo só é executado se savedCount > 0 E scores.length > 0
    
    const dynamicColor = color === 'red' ? colors.left : color === 'blue' ? colors.right : '#4b5563';

    return (
    <div style={{ width: '100%', marginTop: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Viés Pessoal</span>
        <span style={{ fontSize: '14px', fontWeight: '800', color: dynamicColor, textTransform: 'uppercase' }}>
        {label}
        </span>
    </div>

    {/* Barra Estilizada (Estilo Pill) */}
    <div style={{
        width: '100%',
        height: '10px',
        display: 'flex',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#e5e7eb'
    }}>
        <div style={{ width: `${left}%`, backgroundColor: colors.left }} />
        <div style={{ width: `${center}%`, backgroundColor: colors.center }} />
        <div style={{ width: `${right}%`, backgroundColor: colors.right }} />
    </div>

    {/* Legenda de Percentagens + Opinativo Médio */}
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#9ca3af', fontWeight: '700' }}>
        <span>{Math.round(left)}% ESQ</span>
        <span>{Math.round(center)}% CENTRO</span>
        <span>{Math.round(right)}% DIR</span>
        
        {opinativo > 0 && (
        <span style={{ color: '#92400e', backgroundColor: '#fef3c7', padding: '1px 4px', borderRadius: '4px' }}>
            Op. Média: {Math.round(opinativo)}%
        </span>
        )}
    </div>
    </div>
    );
}