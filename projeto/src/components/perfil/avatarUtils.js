// src/utils/avatarUtils.js (Novo Ficheiro)

export const generateDiceBearAvatarUrl = (seed) => { // 🛑 EXPORTAMOS a função
    // Se o seed for vazio, usa "User" para evitar erros na API
    const text = seed ? seed.trim() : 'User'; 
    const encodedSeed = encodeURIComponent(text);
    // Usamos o estilo 'initials' para obter as iniciais
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodedSeed}&size=128&radius=50`; 
};

