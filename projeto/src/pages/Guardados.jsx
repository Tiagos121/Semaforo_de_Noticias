import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { buscarFavoritos } from "../firebase/firestore";
import NewsCard from "../components/NewsCard";

export default function Guardados() {
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const favs = await buscarFavoritos(user.uid);
      setFavoritos(favs);
    }

    fetchData();
  }, [user]);

  if (!user) return <p className="placeholder">Faz login para veres os guardados.</p>;

  return (
    <div className="page-container">
      <h1 className="page-title">⭐ Guardados</h1>

      {favoritos.length === 0 && <p className="placeholder">Ainda não tens favoritos.</p>}

      <div className="news-grid">
        {favoritos.map((n, i) => (
          <NewsCard key={i} noticia={n} />
        ))}
      </div>
    </div>
  );
}
