import React from 'react';
import { 
    useLocationData, 
    useWeatherForecast, 
    timestampToDate, 
    getIconUrl, 
    getTempColor 
} from './ScriptLocalizacao.jsx';

// Componente da previsão semanal
const WeeklyForecast = ({ daily }) => {
    if (!daily) return null;
    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2 border-indigo-100">
                Previsão Semanal (7 Dias)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {daily.map((day, index) => (
                    <div key={day.dt} className="p-3 bg-white rounded-xl shadow-md text-center">
                        <p className="text-sm font-bold text-indigo-600 mb-1">
                            {index === 0 ? "Hoje" : timestampToDate(day.dt).toLocaleDateString('pt-PT', { weekday: 'short' })}
                        </p>
                        <img src={getIconUrl(day.weather[0].icon)} className="w-12 h-12 mx-auto" />
                        <p className={`text-lg font-bold ${getTempColor(day.temp.day)}`}>{Math.round(day.temp.day)}°</p>
                        <p className="text-xs text-gray-500">Noite: {Math.round(day.temp.night)}°</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Componente principal de exibição
export default function DisplayLocalizacao() {
    const { location, loading: locationLoading, error: locationError } = useLocationData();
    const { forecast, loading: weatherLoading, error: weatherError } = useWeatherForecast(location.lat, location.lon);
    const totalLoading = locationLoading || weatherLoading;

    if (totalLoading) return <p className="text-center mt-20">A carregar localização e meteorologia...</p>;

    return (
        <div className="p-6 bg-gray-100 min-h-screen flex justify-center">
            <div className="max-w-5xl w-full bg-white rounded-2xl p-8 shadow-lg">
                {locationError && <p className="text-red-500">Erro: {locationError}</p>}
                {weatherError && <p className="text-red-500">Erro: {weatherError}</p>}

                <h1 className="text-3xl font-bold text-gray-800 mb-2">{location.city}</h1>
                <p className="text-sm text-gray-500 mb-4">
                    {timestampToDate(Date.now() / 1000).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>

                {forecast?.current ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <img src={getIconUrl(forecast.current.icon)} className="w-16 h-16" />
                            <div>
                                <p className={`text-6xl font-bold ${getTempColor(forecast.current.temp)}`}>
                                    {forecast.current.temp}°C
                                </p>
                                <p className="text-lg text-gray-600">{forecast.current.description}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p>Sem dados meteorológicos.</p>
                )}

                <WeeklyForecast daily={forecast?.daily} />
            </div>
        </div>
    );
}