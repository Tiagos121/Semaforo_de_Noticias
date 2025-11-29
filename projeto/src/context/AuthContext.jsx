// AuthContext.jsx (Versão Corrigida para Strict Mode)

import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContextValue";
import { auth } from "../firebase/firebaseConfig";
import { signOut, onAuthStateChanged } from "firebase/auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // Remover logs para evitar confusão de Strict Mode
      setUser(u);
      setLoading(false); 
    });
    return () => unsub();
  }, []);

  const logout = () => signOut(auth);

  // 🛑 CORRIGIDO: O AuthContext APENAS fornece o valor, não bloqueia.
  return (
    <AuthContext.Provider value={{ user, logout, loading }}>
      {children} 
    </AuthContext.Provider>
  );
}