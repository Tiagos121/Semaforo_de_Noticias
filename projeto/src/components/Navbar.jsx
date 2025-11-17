import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "../styles/global.css";

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">Semáforo Notícias</Link>
        <Link to="/guardados">⭐ Guardados</Link>
        <Link to="/locais">📍 Notícias Locais</Link>
        <Link to="/videos">🎥 Vídeos Potentes</Link>
      </div>

      <div className="navbar-right">
        {!user ? (
          <button onClick={login} className="login-btn">Login</button>
        ) : (
          <img
            src={user.photoURL}
            alt="perfil"
            className="perfil-img"
            onClick={logout}
          />
        )}
      </div>
    </nav>
  );
}
