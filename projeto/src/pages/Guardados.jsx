import { useAuth } from "../context/useAuth";
import { useFavoritos } from "../hooks/useFavoritos"; 
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos"; 
import NewsCard from "../components/NewsCard";

export default function Guardados() {
  const { user } = useAuth();
  
  // 🔄 USAR O HOOK EM TEMPO REAL: Não precisamos de useState/useEffect para os dados
  const favoritos = useFavoritos(); 
  

  // Funções necessárias para o NewsCard (copiadas do Home.jsx)
  
  const isFavorito = (url) => favoritos.some((f) => f.url === url);

  const toggleFavorito = async (noticia) => {
    if (!user) {
      alert("Precisas de fazer login para guardar favoritos.");
      return;
    }

    const ja = isFavorito(noticia.url);
    
    try {
        if (ja) {
            const fav = favoritos.find((f) => f.url === noticia.url);
            if (fav?.id) {
                await removerFavorito(fav.id);
                console.log("Favorito removido via toggleFavorito (Guardados).");
            }
        } else {
            // Lógica de adicionar (pode ser necessária se o utilizador clicar rápido)
            const toSave = {
                url: noticia.url,
                title: noticia.title,
                description: noticia.description,
                image: noticia.image || null,
                source: noticia.source || {},
                vies: noticia.detalhes || null,
            };
            await adicionarFavorito(user.uid, toSave);
            console.log("Notícia guardada via toggleFavorito (Guardados).");
        }
    } catch (error) {
        console.error("ERRO CRÍTICO NA FIREBASE:", error);
        alert(`Ocorreu um erro. Verifique as Permissões na Firebase: ${error.message}`);
    }
  };


  if (!user)
    return <p className="placeholder">Faz login para veres os guardados.</p>;

  return (
    <div className="page-container">
      <h1 className="page-title">⭐ Guardados</h1>

      {favoritos.length === 0 && (
        <p className="placeholder">Ainda não tens favoritos.</p>
      )}

      <div className="news-grid">
        {favoritos.map((noticia) => (
          <NewsCard 
            key={noticia.id} // Usar noticia.id para key, que deve ser mais único
            noticia={noticia}
            
            // Passar funções para o NewsCard funcionar corretamente
            isFavorito={isFavorito}
            toggleFavorito={toggleFavorito}
            favoritos={favoritos} 
          />
        ))}
      </div>
    </div>
  );
}