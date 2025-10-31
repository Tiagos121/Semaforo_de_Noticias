import { useEffect, useState } from "react";

export default function TesteNoticias() {
  const [artigos, setArtigos] = useState([]);
  const [erro, setErro] = useState(null);
  const API_KEY = import.meta.env.VITE_GNEWS_API_KEY;

  useEffect(() => {
    const fetchNoticias = async () => {
      try {
        if (!API_KEY) throw new Error("API key não definida!");

        const res = await fetch(
          `https://gnews.io/api/v4/top-headlines?lang=pt&country=pt&max=5&apikey=${API_KEY}`
        );

        if (!res.ok) {
          const texto = await res.text();
          throw new Error(`Erro da API GNews: ${res.status} → ${texto}`);
        }

        const json = await res.json();
        setArtigos(json.articles || []);
      } catch (err) {
        setErro(err.message);
      }
    };

    fetchNoticias();
  }, [API_KEY]);

  if (erro) return <p style={{ color: "red" }}>Erro: {erro}</p>;
  if (!artigos.length) return <p>📰 A carregar notícias...</p>;

  return (
    <div className="card">
      <h2>📰 Notícias</h2>
      {artigos.map((a, i) => (
        <div key={i} className="article">
          <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a>
          <p>{a.source?.name}</p>
        </div>
      ))}
    </div>
  );
}