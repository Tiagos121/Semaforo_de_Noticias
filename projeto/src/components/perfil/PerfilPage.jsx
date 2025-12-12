import { useAuth } from "../../context/useAuth";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import './PerfilPageStyles.css'
import AvatarImage from './AvatarImage';
// 🛑 NOVAS IMPORTAÇÕES
import { analisarViesPessoal } from './analisarPerfil'; 
import BiasSpectrum from '../BiasSpectrum'; // Assumindo que o BiasSpectrum está em '../common/'

export default function PerfilPage() {
  const { user, logout, loading } = useAuth();
  // 🛑 Altera para armazenar o array de notícias guardadas
  const [savedNews, setSavedNews] = useState([]);
  const [biasResult, setBiasResult] = useState(null); // Novo estado para o resultado da análise
  
  // A variável savedCount será calculada a partir de savedNews.length
  const savedCount = savedNews.length;

  

  useEffect(() => {
    if (!user) return;

    async function loadSavedNews() {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      
      const news = snap.exists() ? (snap.data().savedNews || []) : [];
      
      // 🛑 Guarda o array completo de notícias
      setSavedNews(news);
      // setSavedCount(news.length); // Não é mais necessário, é derivado de savedNews.length
      
      // 🛑 Calcular o viés após carregar as notícias
      const result = analisarViesPessoal(news);
      setBiasResult(result);
    }
    loadSavedNews();
  }, [user]);

  // Aguarda que o AuthContext termine de verificar o estado de autenticação
  // 🛑 Verificação de Carregamento (Adicionado biasResult para esperar a análise)
  if (loading || !biasResult) { 
    return <p className="text-center text-lg text-gray-600 mt-20">A carregar dados do perfil...</p>;
  }

  // 2. Verificação de Redirecionamento
  if (!user) {
    return <Navigate to="/login" replace />; 
  }

  // 🛑 Dados da análise (agora que biasResult está garantido)
  const currentRingColor = biasResult.color;
  const biasLabel = biasResult.label;

  // Mapeamento de cor do texto para o rótulo do viés
  const textColorClass = currentRingColor === 'red' ? 'text-red-600' :
                         currentRingColor === 'blue' ? 'text-blue-600' :
                         currentRingColor === 'gray' ? 'text-gray-600' : 'text-black';


  return (
    // Wrapper: Centraliza o cartão vertical e horizontalmente
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      
      {/* Cartão de Perfil: auth-card garante o estilo e flex-col items-center centra tudo internamente */}
      <div className="auth-card flex flex-col items-center gap-2">
        
      <div className="profile-header">
        <div>
            <AvatarImage 
                photoURL={user.photoURL}
                identifier={user.displayName || user.email}
                size="w-32 h-32 profile-image"
                ringColor={currentRingColor} // <--- Cor dinâmica aqui
            />
        </div>
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
        <div className="profile-section">
            <span className="text-gray-500 font-semibold">Notícias Guardadas</span>
            <span className="text-blue-600 font-bold text-xl">{savedCount} ⭐</span>
        </div>

        {/* 🛑 Secção de Viés Pessoal */}
        <div className="profile-section flex-col items-start pt-4 pb-4 w-full"> 
            <div className="flex justify-between w-full">
                <span className="text-gray-500 font-semibold">Viés Pessoal</span>
                <span className={`font-bold text-xl ${textColorClass}`}>
                    {biasLabel}
                </span>
            </div>
            
            {/* 🛑 Reutilização do BiasSpectrum */}
            {savedCount > 0 && (
                <div className="w-full mt-3">
                    <BiasSpectrum 
                        scores={biasResult.scores} // Passa os scores formatados (percentagens)
                        opinativo={biasResult.opinativo} // Passa 0% (ou a média futura)
                    />
                </div>
            )}
            
            {savedCount === 0 && (
                 <p className="text-sm text-gray-500 mt-2 text-center w-full">
                    Guarde notícias para iniciar a análise.
                </p>
            )}

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