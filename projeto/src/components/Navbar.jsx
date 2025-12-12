import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo_sn.png";
import "../styles/global.css";
import AvatarImage from '../components/perfil/AvatarImage'


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
          <Link to="/perfil"> 
            
            <AvatarImage
              photoURL={user.photoURL}
              identifier={user.displayName || user.email}
              // 🛑 APLICAR A CLASSE CSS PURA AQUI:
              size="w-8 h-8 perfil-img"
              
            />
            
          </Link>
        ) : (
          <Link to="/login" className="login-btn">Login</Link>
        )}
      </div>
    </nav>
  );
}