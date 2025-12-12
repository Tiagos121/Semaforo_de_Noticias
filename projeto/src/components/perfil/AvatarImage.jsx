// src/components/common/AvatarImage.jsx
import React from 'react';
import { generateDiceBearAvatarUrl } from './avatarUtils';

export default function AvatarImage({ photoURL, identifier, size = "w-32 h-32", ringColor = "gray"}) {
    
    // 1. Gera o URL de fallback
    const fallbackUrl = generateDiceBearAvatarUrl(identifier);

    // 2. O URL final é o do Firebase OU o gerado
    const finalPhotoUrl = photoURL || fallbackUrl;


    const baseClasses = "profile-border"; 
    
    const customStyles = {
        // 🛑 Garante que o nome da variável está correto e é injetado
        '--ring-color': ringColor 
    };
    

    return (
        <img
            src={finalPhotoUrl} 
            alt={`Foto de perfil de ${identifier || 'Utilizador'}`}
            // Aplica o estilo circular e a moldura (ring)
           className={`${size} ${baseClasses}`} style={customStyles}
            // Adiciona um tratamento de erro caso a URL do Firebase falhe
            onError={(e) => {
                e.target.onerror = null; 
                e.target.src = fallbackUrl; // Usa o URL gerado se o original falhar
            }}
        />
    );
}