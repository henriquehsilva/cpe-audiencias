import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../lib/utils';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-2">
          <WifiOff className="w-4 h-4 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-800 font-medium">
            Sem conexão — exibindo dados em cache
          </p>
        </div>
      </div>
    </div>
  );
};