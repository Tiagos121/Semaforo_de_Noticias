// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Guardados from "./pages/Guardados";
import NoticiasLocais from "./pages/NoticiasLocais";
import VideosPotentes from "./pages/VideosPotentes";
import PerfilPage from "./components/perfil/PerfilPage";
import LoginPage from "./components/perfil/LoginPage";
import Logout from "./components/perfil/Logout";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guardados" element={<Guardados />} />
          <Route path="/locais" element={<NoticiasLocais />} />
          <Route path="/videos" element={<VideosPotentes />} />
           <Route path="/login" element={<LoginPage />} />
           <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/logout" element={<Logout />} />
        </Routes>
        
      </BrowserRouter>
    </AuthProvider>
  );
}
