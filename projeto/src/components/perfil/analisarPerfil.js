// src/components/perfil/analisarPerfil.js

export function analisarViesPessoal(savedNews) { 
    if (!savedNews || savedNews.length === 0) {
        return {
            scores: [],
            opinativo: 0,
            color: 'gray',
            label: 'Nenhuma análise disponível',
        };
    }

    let rawScores = { esquerda: 0, centro: 0, direita: 0 };
    let totalScoreCount = 0;
    let totalOpinativo = 0;
    let opinativoCount = 0;

    savedNews.forEach((news) => {
        // 🔹 Usa 'vies' (Firestore) ou 'detalhes' (Estado local)
        let viesData = news.vies || news.detalhes || null;

        // 🔥 Normalização para resolver objetos Proxy/Map do Firestore
        try {
            if (viesData && typeof viesData === 'object') {
                viesData = JSON.parse(JSON.stringify(viesData));
            }
        } catch {
            viesData = null;
        }

        // Pula notícias sem análise válida para não estragar a média
        if (!viesData || !Array.isArray(viesData.scores_ideologicos)) {
            return;
        }

        // 1️⃣ Soma dos Scores Ideológicos
        viesData.scores_ideologicos.forEach(scoreObj => {
            const label = scoreObj?.label?.toLowerCase().trim();
            const scoreValue = Number(scoreObj?.score) || 0;

            if (label && label in rawScores) {
                rawScores[label] += scoreValue;
                totalScoreCount += scoreValue;
            }
        });

        // 2️⃣ Média de Opinatividade
        const opinativoValue = Number(viesData.opinativo);
        if (!Number.isNaN(opinativoValue)) {
            totalOpinativo += opinativoValue;
            opinativoCount++;
        }
    });

    // Se após o loop não houver scores reais, retorna pendente
    if (totalScoreCount === 0) {
        return { 
            scores: [],
            opinativo: 0,
            color: 'gray',
            label: 'ANÁLISE PENDENTE', 
        };
    }

    // Cálculo exato das percentagens
    const percentages = {
        esquerda: (rawScores.esquerda / totalScoreCount) * 100,
        centro: (rawScores.centro / totalScoreCount) * 100,
        direita: (rawScores.direita / totalScoreCount) * 100
    };

    const scoresArray = [
        { label: 'esquerda', score: percentages.esquerda },
        { label: 'centro', score: percentages.centro },
        { label: 'direita', score: percentages.direita }
    ];

    // 🏆 DETERMINAÇÃO DO VENCEDOR (Onde estava o erro)
    // Ordenamos do maior score para o menor.
    const sortedScores = [...scoresArray].sort((a, b) => b.score - a.score);
    const dominant = sortedScores[0];

    // Mapeamento de cores e labels baseado no vencedor real
    const biasConfig = {
        'esquerda': { color: 'red', label: 'Esquerda' },
        'centro':   { color: 'gray', label: 'Centro' },
        'direita':  { color: 'blue', label: 'Direita' }
    };

    const result = biasConfig[dominant.label] || biasConfig['centro'];

    return {
        scores: scoresArray,
        opinativo: opinativoCount > 0 ? (totalOpinativo / opinativoCount) : 0, 
        color: result.color,
        label: result.label, // Este é o texto que aparece no Span à direita
    };
}