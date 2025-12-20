import { useState } from "react";
import { auth, provider, db } from "../../firebase/firebaseConfig";
import { generateDiceBearAvatarUrl } from './avatarUtils';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  updateProfile,
} from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './AuthStyles.css'

import googleIconUrl from '../../assets/logo_google.png';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  // FUNÇÃO DE VALIDAÇÃO DE CAMPOS ATUALIZADA
  const validateFields = () => {
    if (!email || !password || (isRegister && !name)) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return false;
    }
    setErrorMessage(""); // Limpa a mensagem se a validação passar
    return true;
  };

  const handleEmailAuth = async () => {
    if (!validateFields()) return;

    try {
      let result;

      if (isRegister) {
        // VALIDAÇÃO DE EXISTÊNCIA DE EMAIL
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          setErrorMessage("Já existe um utilizador registado com este email.");
          return;
        }

        // Cria o utilizador
        result = await createUserWithEmailAndPassword(auth, email, password);

        // USO: Chamar a função importada
          const defaultPhotoUrl = generateDiceBearAvatarUrl(name); 
            
            await updateProfile(result.user, { 
                displayName: name,
                photoURL: defaultPhotoUrl // Define o URL gerado
            });
        
        // Adiciona o nome de exibição ao perfil do Firebase Auth
        await updateProfile(result.user, { displayName: name });
        
        await ensureUserInFirestore(result.user.uid, email);
        setErrorMessage(""); // Limpa o erro após sucesso
        // alert("Conta criada com sucesso!"); // Substituído por navegação direta ou mensagem de sucesso no futuro
        
      } else {
        // LOGIN
        result = await signInWithEmailAndPassword(auth, email, password);
      }

      navigate("/");
    } catch (error) {
      // Atualiza o estado da mensagem de erro em vez do alert
      setErrorMessage("Erro: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(""); // Limpa erros anteriores
      const result = await signInWithPopup(auth, provider);
      await ensureUserInFirestore(result.user.uid, result.user.email);
      navigate("/");
    } catch (error) {
      // Atualiza o estado da mensagem de erro em caso de falha no Google
      setErrorMessage("Erro Google: " + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center bg-gray-50 p-4">
      
      {/*Cartão de Autenticação (auth-card) */}
      <div className="auth-card flex flex-col items-center">
        
        <h1 className="auth-title">
          {isRegister ? "Registo" : "Log In"}
        </h1>

        {/*ESTRUTURA DO FORMULÁRIO */}
        <div className="w-full">
            
            {/* Campo Nome (apenas para registo) */}
            {isRegister && (
                <input
                    className="input-field rounded-lg w-full"
                    type="text"
                    placeholder="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            )}

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

        {/* MENSAGEM DE ERRO (HTML) */}
        {errorMessage && (
            <p className="error-message">
                {errorMessage}
            </p>
        )}
        
        {/* Botão principal (Entrar/Registar) */}
        <button
          className="primary-button" 
          onClick={handleEmailAuth}
        >
          {isRegister ? "Registar Agora" : "Entrar"}
        </button>
        
        <div className="divider-line"> 
            <hr />
            <span>OU</span>
            <hr />
        </div>

        {/* Botão Google */}
        <button
            className="google-button" 
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
          className="auth-toggle-link" 
          onClick={() => {
            setIsRegister(!isRegister);
            setEmail("");
            setPassword("");
            setName(""); 
            setErrorMessage(""); // Limpa a mensagem ao alternar
          }}
        >
          {isRegister
            ? "Já tens conta? Faz login aqui."
            : "Não tens conta? Regista-te agora."}
        </p>
      </div>
    </div>
  );
}