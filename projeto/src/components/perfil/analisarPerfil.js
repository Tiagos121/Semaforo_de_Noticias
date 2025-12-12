export function analisarViesPessoal(savedNews) {
    if (!savedNews || savedNews.length === 0) {
        return {
            scores: [],
            opinativo: 0,
            color: 'gray',
            label: 'Nenhuma análise disponível',
        };
    }

    // 🛑 REMOVIDO: const total = savedNews.length; (Substituído pelo totalScore)
    let counts = { left: 0, center: 0, right: 0 };
    let totalScore = 0; 

    savedNews.forEach(news => {
        const bias = news.bias ? news.bias.toLowerCase() : 'center';
        
        // 🛑 CORRIGIDO: Usamos 'in' para verificar se a chave existe
        if (bias in counts) {
            counts[bias]++;
            totalScore++; 
        }
    });

    // 🛑 Tratamento de caso onde totalScore é 0 (Embora o check inicial já trate disso)
    if (totalScore === 0) {
        return analisarViesPessoal([]);
    }

    // Calcular percentagens relativas
    const percentages = {
        left: (counts.left / totalScore) * 100,
        center: (counts.center / totalScore) * 100,
        right: (counts.right / totalScore) * 100
    };

    // Determinar o viés dominante
    let dominantBias = 'center';
    let maxPercent = percentages.center;

    if (percentages.left > maxPercent) {
        maxPercent = percentages.left;
        dominantBias = 'left';
    }
    if (percentages.right > maxPercent && percentages.right >= percentages.left) {
        dominantBias = 'right';
    }

    // Mapeamento de cor e label (Left=Red, Center=Gray, Right=Blue)
    const biasMap = {
        left: { color: 'red', label: 'Esquerda' },
        center: { color: 'gray', label: 'Centro' },
        right: { color: 'blue', label: 'Direita' }
    };

    return {
        scores: [
            { label: 'esquerda', score: percentages.left },
            { label: 'centro', score: percentages.center },
            { label: 'direita', score: percentages.right }
        ],
        opinativo: 0, 
        color: biasMap[dominantBias].color,
        label: biasMap[dominantBias].label,
    };
}