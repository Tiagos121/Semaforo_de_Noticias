import { useState, useEffect } from 'react';
import { buscarFavoritos } from '../firebase/firestore';
import { analisarViesPessoal } from '../components/perfil/analisarPerfil';

const DEFAULT_FALLBACK_RESULT = {
  scores: [
    { label: 'esquerda', score: 0 },
    { label: 'centro', score: 0 },
    { label: 'direita', score: 0 }
  ],
  opinativo: 0,
  color: 'gray',
  label: 'Centro',
};

export function useProfileBias(user) {
  const [biasResult, setBiasResult] = useState(DEFAULT_FALLBACK_RESULT);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) {
      setBiasResult(DEFAULT_FALLBACK_RESULT);
      setSavedCount(0);
      setLoading(false);
      return;
    }

    async function loadProfileAnalysis() {
      setLoading(true);
      try {
        const favoritesList = await buscarFavoritos(user.uid);

        // Normaliza o vies de cada notícia
        favoritesList.forEach((news, idx) => {
          news.vies = news.vies
            ? JSON.parse(JSON.stringify(news.vies))
            : { scores_ideologicos: [], opinativo: 0 };

          console.log(`🧪 NOTÍCIA ${idx} | título:`, news.title);
          console.log(`🧪 NOTÍCIA ${idx} | vies normalizado:`, news.vies);
        });

        // 🔹 AQUI: usar await porque analisarViesPessoal é async
        const result = await analisarViesPessoal(favoritesList);

        setBiasResult(result);
        setSavedCount(favoritesList.length);

        console.log("🧪 PERFIL | biasResult calculado:", result);
        console.log("🧪 PERFIL | Número de notícias guardadas:", favoritesList.length);
      } catch (error) {
        console.error("Erro ao carregar análise de perfil:", error);
        setBiasResult(DEFAULT_FALLBACK_RESULT);
        setSavedCount(0);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAnalysis();
  }, [user]);

  return { biasResult, savedCount, loading };
}