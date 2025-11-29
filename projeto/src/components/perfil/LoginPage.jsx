import { useState } from "react";
import { auth, provider, db } from "../../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

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
    <div className="flex flex-col items-center mt-10 gap-4">
      <h1 className="text-2xl font-bold">
        {isRegister ? "Criar Conta" : "Entrar"}
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
