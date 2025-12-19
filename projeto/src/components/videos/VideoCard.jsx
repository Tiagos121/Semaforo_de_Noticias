import "../../styles/videos.css";

export default function VideoCard({ video }) {
  const { videoId } = video.id;
  const { title, channelTitle, thumbnails } = video.snippet;

  return (
    <div className="video-card">
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={thumbnails.medium.url}
          alt={title}
          className="video-thumb"
        />
      </a>

      <div className="video-info">
        <h3 className="video-title">{title}</h3>
        <p className="video-channel">{channelTitle}</p>
      </div>
    </div>
  );
}
