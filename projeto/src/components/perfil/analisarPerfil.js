// src/components/perfil/analisarPerfil.js
import BiasAnalyzer from '../BiasAnalyzer'; // componente/função que consulta a API

export async function analisarViesPessoal(savedNews) {
    if (!savedNews || savedNews.length === 0) {
        return {
            scores: [
                { label: 'esquerda', score: 0 },
                { label: 'centro', score: 0 },
                { label: 'direita', score: 0 }
            ],
            opinativo: 0,
            color: 'gray',
            label: 'Nenhuma análise disponível',
        };
    }

    const allVies = [];

    for (const news of savedNews) {
        let viesData = news.vies || { scores_ideologicos: [], opinativo: 0 };

        // Normaliza Map/Proxy Firestore
        try {
            viesData = JSON.parse(JSON.stringify(viesData));
        } catch {
            viesData = { scores_ideologicos: [], opinativo: 0 };
        }

        // Se não tiver scores, chama o BiasAnalyzer
        if (!viesData.scores_ideologicos || viesData.scores_ideologicos.length === 0) {
            try {
                const apiResult = await BiasAnalyzer(news.title, news.description || "");
                viesData = apiResult || { scores_ideologicos: [], opinativo: 0 };
            } catch {
                viesData = { scores_ideologicos: [], opinativo: 0 };
            }
        }

        allVies.push(viesData);
    }

    // Soma e calcula médias
    const totalScores = { esquerda: 0, centro: 0, direita: 0 };
    let totalOpinativo = 0;
    let opinativoCount = 0;

    allVies.forEach(vies => {
        vies.scores_ideologicos.forEach(s => {
            const label = s.label.toLowerCase();
            if (label in totalScores) totalScores[label] += Number(s.score) || 0;
        });
        const opinativoVal = Number(vies.opinativo);
        if (!isNaN(opinativoVal)) {
            totalOpinativo += opinativoVal;
            opinativoCount++;
        }
    });

    const total = totalScores.esquerda + totalScores.centro + totalScores.direita;
    const scoresArray = total === 0
        ? [
            { label: 'esquerda', score: 0 },
            { label: 'centro', score: 0 },
            { label: 'direita', score: 0 }
          ]
        : [
            { label: 'esquerda', score: (totalScores.esquerda / total) * 100 },
            { label: 'centro', score: (totalScores.centro / total) * 100 },
            { label: 'direita', score: (totalScores.direita / total) * 100 }
          ];

    const dominant = scoresArray.reduce((prev, curr) => curr.score > prev.score ? curr : scoresArray[1]);
    const biasMap = {
        esquerda: { color: 'red', label: 'Esquerda' },
        centro: { color: 'gray', label: 'Centro' },
        direita: { color: 'blue', label: 'Direita' },
    };

    return {
        scores: scoresArray,
        opinativo: opinativoCount > 0 ? totalOpinativo / opinativoCount : 0,
        color: biasMap[dominant.label].color,
        label: biasMap[dominant.label].label
    };
}
