import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Função para formatar data em português
export const formatDateBR = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

// Função para formatar data e hora
export const formatDateTimeBR = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Função para detectar se está offline
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};

// Toast notifications simples
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

let toastId = 0;
const toastCallbacks: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

export const useToasts = () => {
  const [toastList, setToastList] = useState<Toast[]>(toasts);
  
  useEffect(() => {
    toastCallbacks.add(setToastList);
    return () => {
      toastCallbacks.delete(setToastList);
    };
  }, []);
  
  return toastList;
};

export const addToast = (toast: Omit<Toast, 'id'>) => {
  const newToast: Toast = {
    ...toast,
    id: (++toastId).toString(),
    duration: toast.duration || 5000
  };
  
  toasts = [...toasts, newToast];
  toastCallbacks.forEach(callback => callback(toasts));
  
  // Auto remove
  setTimeout(() => {
    removeToast(newToast.id);
  }, newToast.duration);
};

export const removeToast = (id: string) => {
  toasts = toasts.filter(toast => toast.id !== id);
  toastCallbacks.forEach(callback => callback(toasts));
};

// Hook para debounce
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

import { useState, useEffect } from 'react';