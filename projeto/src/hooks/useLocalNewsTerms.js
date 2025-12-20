import { useState, useEffect } from 'react';

const INITIAL_QUERY_TERMS = ['notícias Portugal'];

export function useLocalNewsTerms(location) {
  const [queryTerms, setQueryTerms] = useState(INITIAL_QUERY_TERMS);
  const [cityName, setCityName] = useState("Portugal");

  useEffect(() => {
    
    if (!location) {
      setQueryTerms(INITIAL_QUERY_TERMS);
      setCityName("Portugal");
      return;
    }

    
    const primaryName = location.city || location.concelho || location.distrito || "Portugal";
    setCityName(primaryName);

    
    if (primaryName === "Portugal") {
      setQueryTerms(['notícias Portugal']);
      return;
    }

    
    const locaisEspecificos = [location.city, location.concelho]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i) 
      .map(l => `"${l}"`) 
      .join(" OR ");

    const distrito = location.distrito ? `"${location.distrito}"` : null;

    
    const finalTerms = [];

    
    if (locaisEspecificos) {
      finalTerms.push(locaisEspecificos);
    }

    
    if (distrito && distrito !== locaisEspecificos) {
      finalTerms.push(distrito);
    }

    
    if (finalTerms.length === 0) {
      finalTerms.push('notícias Portugal');
    }

    setQueryTerms(finalTerms);

  }, [location]);

  return { queryTerms, cityName };
}