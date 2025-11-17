// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Guardados from "./pages/Guardados";
import NoticiasLocais from "./pages/NoticiasLocais";
import VideosPotentes from "./pages/VideosPotentes";
import Perfil from "./pages/Perfil";

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
          <Route path="/perfil" element={<Perfil />} />
        </Routes>

      </BrowserRouter>
    </AuthProvider>
  );
}
