// PerfilPage.jsx - Componente de Perfil do Usuário

import { useAuth } from "../../context/useAuth";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import './PerfilPageStyles.css'

export default function PerfilPage() {
  const { user, logout, loading } = useAuth();
  const [savedCount, setSavedCount] = useState(0);

  // 🛑 Defina a URL Padrão aqui. Usamos um valor estático, mas o nome real será usado no Registo
  const DEFAULT_AVATAR_URL = 'https://ui-avatars.com/api/?name=User&background=3B82F6&color=fff&size=128';

  useEffect(() => {
    if (!user) return;

    async function loadSavedNews() {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setSavedCount(data.savedNews?.length || 0);
      }
    }
    loadSavedNews();
  }, [user]);

  // Aguarda que o AuthContext termine de verificar o estado de autenticação
  // 1. Verificação de Carregamento
  if (loading) {
    return <p className="text-center text-lg text-gray-600 mt-20">A carregar dados do perfil...</p>;
  }

  // 2. Verificação de Redirecionamento
  if (!user) {
    return <Navigate to="/login" replace />; 
  }

  return (
    // Wrapper: Centraliza o cartão vertical e horizontalmente
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      
      {/* Cartão de Perfil: auth-card garante o estilo e flex-col items-center centra tudo internamente */}
      <div className="auth-card flex flex-col items-center gap-2">
        
        {/* 🛑 NOVO: Usa a classe CSS .profile-header para centrar o bloco */}
      <div className="profile-header">
          <img
                src={user.photoURL || DEFAULT_AVATAR_URL} 
                alt="foto de perfil"
                className="w-32 h-32 rounded-full object-cover ring-4 ring-blue-300 shadow-xl"
            />
          <h1 className="text-3xl font-extrabold text-gray-900 mt-4 text-center pt-5">
              {user.displayName || user.email.split('@')[0]}
          </h1>
      </div>
        
        <div className="profile-section border-b-0 pb-0">

        </div>
        {/* Secção de Detalhes: Email */}
        <div className="profile-section">
            <span className="text-gray-500 font-semibold">Email</span>
            <span className="text-gray-700 font-medium">{user.email}</span>
        </div>
        
        {/* Secção de Detalhes: Notícias Guardadas */}
        <div className="profile-section border-b-0 pb-0">
            <span className="text-gray-500 font-semibold">Notícias Guardadas</span>
            <span className="text-blue-600 font-bold text-xl">{savedCount} ⭐</span>
        </div>

        {/* Botão de Logout (usa a classe CSS personalizada) */}
        <button
          className="logout-button w-full mt-8"
          onClick={logout}
        >
          Terminar Sessão
        </button>
      </div>
    </div>
  );
}
