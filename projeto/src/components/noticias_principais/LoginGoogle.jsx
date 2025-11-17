import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../../context/AuthContext';

export default function LoginGoogle() {
  const { user } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      alert('Erro no login: ' + error.message);
    }
  };

  if (user) return <p>Bem-vindo, {user.displayName}!</p>;

  return (
    <div className="flex justify-center">
      <button
        onClick={handleGoogleLogin}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Login com Google
      </button>
    </div>
  );
}