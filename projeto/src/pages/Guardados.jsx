// src/pages/Guardados.jsx
import { useAuth } from "../context/useAuth";
// ✅ AGORA USAMOS O HOOK DE AÇÕES
import { useFavoritosActions } from "../hooks/useFavoritiosActions"; 
import NewsCard from "../components/NewsCard";

export default function Guardados() {
  const { user } = useAuth();
  
  // ÚNICA CHAMADA: Obtém todas as funções e a lista 'favoritos' do hook
  const { toggleFavorito, isFavorito, favoritos } = useFavoritosActions();
  

  if (!user)
    return <p className="placeholder">Faz login para veres os guardados.</p>;

  return (
    <div className="page-container">
      <div style={{backgroundColor: "#9ca3af", padding: "25px", marginBottom: 20, borderRadius:"40px"}}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white"}}>⭐ Guardados</h1>
        <p style={{ color: "white", marginBottom: 18 }}>
          Notícias Guardadas. Podes remover dos guardados ao carregar na estrela.
        </p>
      </div>

      {favoritos.length === 0 && (
        <p className="placeholder">Ainda não tens favoritos.</p>
      )}

      <div 
        className="news-grid"
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        {favoritos.map((noticia) => (
          <NewsCard 
            key={noticia.id} 
            noticia={noticia}
            isFavorito={isFavorito}
            toggleFavorito={toggleFavorito}
          />
        ))}
      </div>
    </div>
  );
}