// src/hooks/useFavoritosActions.js

import { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { useFavoritos } from "./useFavoritos"; 
import { adicionarFavorito, removerFavorito } from "../firebase/favoritos";
import defaultImage from "../assets/fundo_sn.png"; 




export function useFavoritosActions() {
    const { user } = useContext(AuthContext);
    const favoritos = useFavoritos(); 

    const isFavorito = (url) => favoritos.some((f) => f.url === url);

    const toggleFavorito = async (noticia) => {
        if (!user) {
            alert("Precisas de fazer login para guardar favoritos.");
            return;
        }


        const jaFavorito = isFavorito(noticia.url);

        try {
            if (jaFavorito) {
                const fav = favoritos.find((f) => f.url === noticia.url);
                if (fav?.id) {
                    await removerFavorito(fav.id);
                    alert("✅ Removido dos Guardados.");
                }
            } else {
                // 🛑 CORREÇÃO CRÍTICA: Limpeza do objeto 'vies' para resolver o erro do Proxy/Map no Firebase
                let viesDataLimpa = null;
                
                if (noticia.detalhes || noticia.vies) {
                    try {
                        const dataParaLimpar = noticia.detalhes || noticia.vies;
                        // Força a conversão para POJO (Plain Old JavaScript Object)
                        viesDataLimpa = JSON.parse(JSON.stringify(dataParaLimpar));
                    } catch (e) {
                        console.error("Erro ao limpar dados de viés:", e);
                        viesDataLimpa = null; 
                    }
                }

                const toSave = {
                    url: noticia.url,
                    title: noticia.title,
                    description: noticia.description || "",
                    image: noticia.image || defaultImage,
                    source: noticia.source || {},
                    vies: viesDataLimpa, // Usa a versão limpa
                };

                await adicionarFavorito(user.uid, toSave);
                alert("⭐ Guardado nos Favoritos!");
            }
        } catch (error) {
            console.error("ERRO FIREBASE:", error);
            alert(`Erro ao processar favorito: ${error.message}`);
        }
    };

    return { toggleFavorito, isFavorito, favoritos };
}