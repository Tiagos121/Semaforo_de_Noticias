import { useState, useEffect } from 'react';

// Fallback inicial seguro
const INITIAL_QUERY_TERMS = ['notícias Portugal'];

export function useLocalNewsTerms(location) {
  const [queryTerms, setQueryTerms] = useState(INITIAL_QUERY_TERMS);
  const [cityName, setCityName] = useState("Portugal");

  useEffect(() => {
    // Se ainda não temos localização, mostramos Portugal
    if (!location) {
      setQueryTerms(INITIAL_QUERY_TERMS);
      setCityName("Portugal");
      return;
    }


    // Se for "Portugal", é porque falhou o reverso, então assumimos nacional.
    const primaryName = location.city || location.concelho || location.distrito || "Portugal";
    setCityName(primaryName);

    if (primaryName === "Portugal") {
      setQueryTerms(['notícias Portugal']);
      return;
    }

    // Construir a Query Local
    const termosLocais = [
      location.city,
      location.concelho,
      location.distrito
    ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicados
    .map(local => `"${local}"`); // Aspas para nomes compostos

    const localQuery = termosLocais.join(" OR ");


    const finalTerms = [];
    
    if (localQuery) {
      finalTerms.push(localQuery); 
    }
    
    finalTerms.push("notícias Portugal"); 

    setQueryTerms(finalTerms);

  }, [location]);

  return { queryTerms, cityName };
}