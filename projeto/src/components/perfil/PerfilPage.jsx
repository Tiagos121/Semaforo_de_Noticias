// src/components/perfil/PerfilPage.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useProfileBias } from '../../hooks/useProfileBias';
import ProfileBiasSpectrum from './ProfileBiasSpectrum';
import AvatarImage from './AvatarImage';

import './PerfilPageStyles.css';

export default function PerfilPage() {
    const { user, logout, loading: authLoading } = useAuth();

    // 🛑 Usa o hook atualizado
    const { biasResult, savedCount, loading: biasLoading } = useProfileBias(user);

    const pageLoading = authLoading || biasLoading;

    // Loading Screen
    if (pageLoading) {
        return <p className="text-center text-lg text-gray-600 mt-20">A carregar dados do perfil...</p>;
    }

    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="auth-card flex flex-col items-center gap-2">

                <div className="profile-header">
                    <AvatarImage
                        photoURL={user.photoURL}
                        identifier={user.displayName || user.email}
                        size="w-32 h-32 profile-image"
                        ringColor={biasResult.color}
                    />
                    <h1 className="text-3xl font-extrabold text-gray-900 mt-4 text-center">
                        {user.displayName || user.email.split('@')[0]}
                    </h1>
                </div>

                <hr style={{ width: '100%', border: '0', borderTop: '1px solid #eee', margin: '15px 0' }} />

                <div className="profile-section">
                    <span className="text-gray-500 font-semibold">Email</span>
                    <span className="text-gray-700 font-medium">{user.email}</span>
                </div>

                <div className="profile-section">
                    <span className="text-gray-500 font-semibold">Notícias Guardadas</span>
                    <span className="text-blue-600 font-bold text-xl">{savedCount} ⭐</span>
                </div>

                {/* Componente de viés com os resultados reais */}
                <ProfileBiasSpectrum
                    biasResult={biasResult}
                    savedCount={savedCount}
                />

                <button className="logout-button w-full mt-8" onClick={logout}>
                    Terminar Sessão
                </button>
            </div>
        </div>
    );
}
