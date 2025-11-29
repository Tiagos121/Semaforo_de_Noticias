// Logout.jsx (PerfilPage - Versão Completa e Corrigida)

import { useAuth } from "../../context/useAuth";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom"; 

export default function PerfilPage() {
  // ✅ CORRIGIDO: Importar o 'loading'
  const { user, logout, loading } = useAuth(); 
  const [savedCount, setSavedCount] = useState(0);

  // 💡 O 'useEffect' deve vir antes de qualquer 'return' condicional
  useEffect(() => { 
    // Como o 'loading' vai bloquear o componente se não houver user, esta verificação é extra
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

  // 🛑 LOG 2: O que o PerfilPage vê (ANTES DE REDIRECIONAR)
  console.log(
      "LOG 2 (PERFIL PAGE): Estado -> Loading:", 
      loading, 
      "| User:", 
      user ? "Existe" : "NULL"
  );

  // 🛑 1. Verificação de Carregamento: Espera que o AuthContext termine.
  if (loading) {
      return <p>A carregar dados do perfil...</p>;
  }

  // 🛑 2. Verificação de Redirecionamento: Se o loading terminou E não há user, redireciona.
  if (!user) {
      return <Navigate to="/login" replace />; 
  }

  // Se chegou aqui, o utilizador existe.
  return (
    <div className="flex flex-col items-center mt-10 gap-4">
      <img
        src={user.photoURL}
        alt="foto"
        className="w-20 h-20 rounded-full shadow"
      />

      <h1 className="text-2xl font-bold">{user.displayName}</h1>
      <p>{user.email}</p>
      <p>Notícias guardadas: {savedCount}</p>

      <button
        className="bg-red-600 text-white px-6 py-2 rounded"
        onClick={logout}
      >
        Terminar Sessão
      </button>
    </div>
  );
}