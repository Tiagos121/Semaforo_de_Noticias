import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo_sn.png";
import "../styles/global.css";


export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">
          <img src={logo} alt="Semáforo Notícias" className="navbar-logo" />
        </Link>

        <Link to="/guardados">⭐ Guardados</Link>
        <Link to="/locais">📍 Notícias Locais</Link>
        <Link to="/videos">🎥 Vídeos e Podcasts</Link>
      </div>

      <div className="navbar-right">
        {user ? (
          // 1. SE O UTILIZADOR EXISTIR, vai para a página /perfil (que contém o Logout.jsx)
          <Link to="/perfil"> 
            <img
              src={user.photoURL}
              alt="perfil"
              className="perfil-img"
            />
          </Link>
        ) : (
          // 2. SE NÃO EXISTIR, mostra o botão Login
          <Link to="/login" className="login-btn">Login</Link>
        )}
      </div>
    </nav>
  );
}