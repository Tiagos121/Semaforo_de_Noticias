import React from 'react';

// O componente BiasSpectrum é extraído aqui para ser reutilizável
export default function BiasSpectrum({ scores, opinativo = 0,}) {
    if (!scores || scores.length === 0) return null;

    const esquerda = scores.find(s => s.label === "esquerda")?.score || 0;
    const centro   = scores.find(s => s.label === "centro")?.score || 0;
    const direita  = scores.find(s => s.label === "direita")?.score || 0;

    // Normalização correta
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

        {/* BARRA */}
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

          {/* DIREITA */}
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
}