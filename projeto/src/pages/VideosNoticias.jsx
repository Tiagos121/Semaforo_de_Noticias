import { useState } from "react";
import { useNoticiasVideos } from "../hooks/useNoticiasVideos";
import SearchBar from "../components/videos/SearchBar";
import VideoCard from "../components/videos/VideoCard";

// Definição única do limite
const LIMITE_VIDEOS = 4;

export default function VideosNoticias() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Passamos o termo e o limite para o Hook centralizado
  const { videos, loading, noticiaOriginal } = useNoticiasVideos(searchTerm, LIMITE_VIDEOS);

  return (
    <div className="page-container">
      <div style={{ backgroundColor: "#1e3a8a", padding: "25px", marginBottom: 20, borderRadius: "40px" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: "white" }}>
          ⚖️ Semáforo Notícias — Política
        </h1>
        <p style={{ color: "white" }}>
          Pesquisa inteligente assistida por Gemini para vídeos de política internacional e nacional.
        </p>
      </div>

      <SearchBar onSearch={setSearchTerm} />

      <div style={{ borderBottom: "2px solid #e5e7eb", margin: "30px 0 20px 0", paddingBottom: "10px" }}>
        <h2 style={{ fontSize: "20px", color: "#374151", display: "flex", alignItems: "center", gap: "10px" }}>
          <i className="fa-solid fa-play" style={{ color: "#ef4444" }}></i>
          {searchTerm ? `Resultados para: ${searchTerm}` : "Vídeos de política mais recentes"}
        </h2>
      </div>

      {loading ? (
        <p>A carregar vídeos relevantes...</p>
      ) : (
        <>
          {!searchTerm && noticiaOriginal && (
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "15px" }}>
              <b>Fonte GNews:</b> {noticiaOriginal.title}
            </p>
          )}
          
          <div className="video-grid">
            {videos && videos.length > 0 ? (
              videos.map(video => (
                <VideoCard key={video.id.videoId || Math.random()} video={video} />
              ))
            ) : (
                <div
                  style={{
                    padding: 12,
                    background: "#fff",
                    borderRadius: 10,
                    marginBottom: 12,
                  }}
                >
                  <strong>Nenhum video encontrado</strong>
                </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}