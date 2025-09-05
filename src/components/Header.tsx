import React from 'react';
import { LogOut, Calendar } from 'lucide-react';
import { useAuth, logout } from '../lib/auth';
import { addToast } from '../lib/utils';

export const Header: React.FC = () => {
  const { user, role } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      addToast({ type: 'success', message: 'Logout realizado com sucesso!' });
    } catch (error) {
      addToast({ type: 'error', message: 'Erro ao fazer logout' });
    }
  };

  const getRoleDisplay = (role: string | null) => {
    switch (role) {
      case 'pm':
        return { label: 'Policial Militar', color: 'bg-blue-100 text-blue-800' };
      case 'sad':
        return { label: 'Administrador', color: 'bg-cpe-red bg-opacity-10 text-cpe-red' };
      default:
        return { label: 'Usuário', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const roleDisplay = getRoleDisplay(role);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e título */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Calendar className="w-8 h-8 text-cpe-red" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-cpe-dark font-thoughtworks">
                  CPE
                </h1>
                <p className="text-xs text-gray-600 -mt-1">Agenda de Audiências</p>
              </div>
            </div>
          </div>

          {/* Informações do usuário */}
          <div className="flex items-center space-x-4">
            {/* Role badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleDisplay.color}`}>
              {roleDisplay.label}
            </span>

            {/* User info */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">Conectado</p>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cpe-red transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};