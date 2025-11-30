import { useState } from "react";
import { auth, provider, db } from "../../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import googleIconUrl from '../../assets/logo_google.png';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const navigate = useNavigate();

  // Criar user Firestore se ainda não existir
  const ensureUserInFirestore = async (uid, email) => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        email,
        savedNews: [],
        createdAt: new Date(),
      });
    }
  };

  const handleEmailAuth = async () => {
    try {
      let result;

      if (isRegister) {
        result = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserInFirestore(result.user.uid, email);
        alert("Conta criada com sucesso!");
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }

      navigate("/");
    } catch (error) {
      alert("Erro: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      await ensureUserInFirestore(result.user.uid, result.user.email);
      navigate("/");
    } catch (error) {
      alert("Erro Google: " + error.message);
    }
  };

  return (
    // Wrapper: min-h-screen flex items-center justify-center
    <div className="flex items-center justify-center bg-gray-50 p-4">
      
      {/* 💡 Cartão de Autenticação (auth-card) */}
      <div className="auth-card flex flex-col items-center">
        
        <h1 className="auth-title">
          {isRegister ? "Criar Sua Conta" : "Log In"}
        </h1>

        {/* 🛑 Estrutura do Formulário Simplificada */}
        <div className="w-full">
            <input
                className="input-field rounded-lg w-full"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <input
                className="input-field rounded-lg w-full"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
        </div>
        
        {/* Botão principal (Entrar/Registar) */}
        <button
          className="primary-button" // Usando a nova classe CSS pura
          onClick={handleEmailAuth}
        >
          {isRegister ? "Registar Agora" : "Entrar"}
        </button>

        {/* Linha Divisória */}
        <div className="divider-line"> {/* Usando a nova classe para estilizar */}
            <hr />
            <span>OU</span>
            <hr />
        </div>

        {/* Botão Google */}
      <button
            className="google-button" // Usando a classe CSS pura para centralização e estilo
            onClick={handleGoogleLogin}
        >
            <img 
                src={googleIconUrl}
                alt="Google Icon"
                className="google-icon"
            />
            
            Continuar com Google
        </button>
        
        <p
          className="auth-toggle-link" // Usando a nova classe
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister
            ? "Já tens conta? Faz login aqui."
            : "Não tens conta? Regista-te agora."}
        </p>
      </div>
    </div>
);
}
