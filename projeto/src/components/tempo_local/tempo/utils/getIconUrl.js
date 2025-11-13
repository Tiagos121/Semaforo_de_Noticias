// src/components/Weather/utils/getIconUrl.js
export const getIconUrl = (iconCode) => {
  switch (iconCode) {
    case '01d': return '☀️';
    case '02d':
    case '03d':
    case '04d': return '🌤️';
    case '09d':
    case '10d': return '🌧️';
    case '13d': return '❄️';
    default: return '☁️';
  }
};