import { useAuth } from "../context/useAuth";
import { guardarFavorito } from "../firebase/firestore";
import "../styles/cards.css";

export default function NewsCard({ noticia }) {
  const { user } = useAuth();

  const handleGuardar = async () => {
    if (!user) return alert("Tens de fazer login para guardar.");
    await guardarFavorito(user.uid, noticia);
    alert("Notícia guardada!");
  };

  return (
    <div className="news-card">
      <h2 className="news-title">{noticia.title}</h2>
      <p className="news-desc">{noticia.description}</p>

      <a href={noticia.url} target="_blank" className="news-link">
        Ler notícia completa →
      </a>

      {user && (
        <button className="save-btn" onClick={handleGuardar}>
          ⭐ Guardar
        </button>
      )}
    </div>
  );
}
