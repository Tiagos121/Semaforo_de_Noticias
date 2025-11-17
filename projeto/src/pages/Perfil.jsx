import { useAuth } from "../context/useAuth";

export default function Perfil() {
  const { user } = useAuth();

  if (!user) return <p className="placeholder">Tens de iniciar sessão.</p>;

  return (
    <div className="page-container">
      <h1>👤 Perfil</h1>
      <img src={user.photoURL} alt="" className="perfil-img-large" />
      <p><strong>Nome:</strong> {user.displayName}</p>
      <p><strong>Email:</strong> {user.email}</p>
    </div>
  );
}
