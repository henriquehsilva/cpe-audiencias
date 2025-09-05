import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Eye, EyeOff, WifiOff } from 'lucide-react';
import { login } from '../lib/auth';
import { addToast } from '../lib/utils';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('E-mail inválido')
    .min(1, 'E-mail é obrigatório'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
  rememberMe: z.boolean().optional()
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState<boolean>(!navigator.onLine);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true }
  });

  // Monitorar conectividade (online/offline)
  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Mapeia erros do Firebase para mensagens amigáveis
  const mapFirebaseError = (code?: string): string => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'E-mail ou senha incorretos';
      case 'auth/invalid-email':
        return 'E-mail inválido';
      case 'auth/user-disabled':
        return 'Conta desabilitada';
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde';
      case 'auth/network-request-failed':
        return 'Falha de rede. Verifique sua internet, desative VPN/Ad-block e recarregue a página.';
      case 'auth/invalid-api-key':
        return 'API key inválida. Confira o arquivo .env (.env.local) e reinicie o servidor de dev.';
      default:
        return 'Erro ao fazer login';
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    if (offline) {
      addToast({ type: 'error', message: 'Sem conexão. Conecte-se à internet para entrar.' });
      return;
    }
    setLoading(true);
    try {
      await login(data.email.trim(), data.password, data.rememberMe);
      addToast({ type: 'success', message: 'Login realizado com sucesso!' });
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      const message = mapFirebaseError(error?.code);
      addToast({ type: 'error', message });

      // Opcional: atrelar erro ao campo para feedback inline
      if (error?.code === 'auth/invalid-email') {
        setError('email', { message: 'E-mail inválido' });
      } else if (error?.code === 'auth/wrong-password') {
        setError('password', { message: 'Senha incorreta' });
      }
    } finally {
      setLoading(false);
    }
  };

  const emailVal = watch('email');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Banner offline */}
        {offline && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-yellow-800">
            <WifiOff className="w-4 h-4" />
            <span>Sem conexão. O login requer internet.</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-cpe-red bg-opacity-10 p-3 rounded-xl">
                <Calendar className="w-8 h-8 text-cpe-red" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-cpe-dark font-thoughtworks">
              CPE
            </h1>
            <p className="text-gray-600 mt-2">Agenda de Audiências</p>
          </div>

          {/* Live region p/ mensagens de validação gerais */}
          <div className="sr-only" role="status" aria-live="polite">
            {isSubmitting || loading ? 'Entrando...' : ''}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="seu.email@exemplo.com"
                disabled={loading}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors pr-12 ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  disabled={loading}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? 'password-error' : capsLock ? 'capslock-hint' : undefined
                  }
                  onKeyUp={(e) => setCapsLock((e as any).getModifierState?.('CapsLock'))}
                  onKeyDown={(e) => setCapsLock((e as any).getModifierState?.('CapsLock'))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {capsLock && !errors.password && (
                <p id="capslock-hint" className="mt-1 text-xs text-amber-600">
                  Caps Lock ativado
                </p>
              )}
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                type="checkbox"
                id="rememberMe"
                className="h-4 w-4 text-cpe-red focus:ring-cpe-red border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                Manter conectado
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || offline}
              className="w-full bg-cpe-red text-white py-3 px-4 rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cpe-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </button>

            {/* Dica em dev (opcional) */}
            {import.meta.env.DEV && (
              <p className="text-xs text-gray-500 text-center">
                Domínio autorizado no Firebase Auth? <code className="font-mono">localhost</code> •
                API key correta? {Boolean(import.meta.env.VITE_FIREBASE_API_KEY) ? '✅' : '❌'}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
