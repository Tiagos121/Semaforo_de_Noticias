// src/hooks/useLocalNewsTerms.js
import { useState, useEffect } from 'react';

const INITIAL_QUERY_TERMS = ['notícias portugal', 'acontecimentos portugal'];

/**
 * Hook para gerar termos de pesquisa de notícias locais com lógica de fallback.
 * Prioriza: Cidade > Concelho > Distrito > País.
 * @param {object | null} location - O objeto de localização retornado por useLocationData.
 * @returns {string[]} Lista de termos de pesquisa (e.g., ["notícias Lisboa", "acontecimentos Lisboa"]).
 */
export function useLocalNewsTerms(location) {
  const [queryTerms, setQueryTerms] = useState(INITIAL_QUERY_TERMS);
  const [cityName, setCityName] = useState("Portugal"); // Estado para o nome da cidade visível

  useEffect(() => {
    if (!location) {
      setQueryTerms(INITIAL_QUERY_TERMS);
      setCityName("Portugal");
      return;
    }

    // 1. Criar uma lista de níveis geográficos em ordem de prioridade.
    // O useLocationData deve retornar: { city, freguesia, concelho, distrito, pais }
    const termsOrder = [
      location.city,
      location.concelho,
      location.distrito,
      location.pais, // Fica como último fallback
    ]
    // Remover termos nulos, undefined ou vazios, e remover duplicados.
    .filter(name => name)
    .filter((value, index, self) => self.indexOf(value) === index); 

    // O termo principal para o título da página é o mais específico (cidade)
    const primaryTerm = termsOrder[0] || "Portugal";
    setCityName(primaryTerm);

    // 2. Gerar a lista final de queries (Ex: ["notícias Aveiro", "acontecimentos Aveiro", "notícias Portugal", ...])
    const newTerms = termsOrder.flatMap(term => [
        `notícias ${term}`, 
        `acontecimentos ${term}`
    ]);
    
    // 3. Garante que há sempre um fallback (Portugal)
    if (newTerms.length === 0) {
      setQueryTerms(INITIAL_QUERY_TERMS);
    } else {
      setQueryTerms(newTerms);
    }

  }, [location]);

  return { queryTerms, cityName };
}