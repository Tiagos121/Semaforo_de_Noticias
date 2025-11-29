import { useState } from "react";
import { auth, provider } from "../../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleEmailAuth = async () => {
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Conta criada com sucesso!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert("Erro: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("Erro Google: " + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center mt-10 gap-4">
      <h1 className="text-2xl font-bold">
        {isRegister ? "Criar Conta" : "Login"}
      </h1>

      <input
        className="border px-3 py-2 rounded w-80"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border px-3 py-2 rounded w-80"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded w-80"
        onClick={handleEmailAuth}
      >
        {isRegister ? "Criar conta" : "Entrar"}
      </button>

      <button
        className="bg-red-500 text-white px-4 py-2 rounded w-80"
        onClick={handleGoogleLogin}
      >
        Entrar com Google
      </button>

      <p
        className="text-blue-600 cursor-pointer"
        onClick={() => setIsRegister(!isRegister)}
      >
        {isRegister
          ? "Já tens conta? Faz login"
          : "Não tens conta? Regista-te"}
      </p>
    </div>
  );
}
