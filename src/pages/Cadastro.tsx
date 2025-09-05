import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { formDataToAgenda, createAgenda } from '../lib/firestore';
import { addToast } from '../lib/utils';

const cadastroSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  horario: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido (HH:mm)'),
  local: z.string().min(2, 'Local deve ter pelo menos 2 caracteres'),
  policial: z.string().min(2, 'Posto/Nome Policial deve ter pelo menos 2 caracteres'),
  modalidade: z.string().min(1, 'Modalidade é obrigatória'),
  // default('') garante string (evita undefined)
  sei: z.string().optional().default(''),
});

// Tipo do formulário derivado do schema (evita mismatch com o resolver/RHF)
type FormValues = z.infer<typeof cadastroSchema>;

const modalidadesPadrao = ['VIDEOCONFERÊNCIA', 'PRESENCIAL'];

export const Cadastro: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customModalidade, setCustomModalidade] = useState('');
  const [showCustomModalidade, setShowCustomModalidade] = useState(false);

  // Guarde o hook em uma const para preservar os genéricos
  const form = useForm<FormValues>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      data: '',
      horario: '',
      local: '',
      policial: '',
      modalidade: '',
      sei: '',
    },
  });

  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const modalidadeRegister = register('modalidade');
  const modalidadeValue = watch('modalidade');

  // Deixe o TS inferir o tipo do onSubmit (não anote como SubmitHandler<>)
  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    setLoading(true);
    try {
      if (showCustomModalidade && customModalidade.trim()) {
        data.modalidade = customModalidade.trim();
      }

      // Se formDataToAgenda tipa um tipo diferente, faça cast mínimo
      const agendaData = formDataToAgenda(data as any, user.uid);
      await createAgenda(agendaData);

      addToast({ type: 'success', message: 'Audiência cadastrada com sucesso!' });
      navigate('/');
    } catch (error) {
      console.error('Error creating agenda:', error);
      addToast({ type: 'error', message: 'Erro ao cadastrar audiência' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalidadeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomModalidade(true);
      setValue('modalidade', '');
    } else {
      setShowCustomModalidade(false);
      setCustomModalidade('');
      setValue('modalidade', value);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova Audiência</h1>
            <p className="text-gray-600 mt-1">Preencha os dados da audiência</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Use o handleSubmit tipado de 'form' para manter TFieldValues = FormValues */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Data e Horário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <input
                {...register('data')}
                type="date"
                id="data"
                aria-invalid={!!errors.data}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors ${
                  errors.data ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.data && <p className="mt-1 text-sm text-red-600">{errors.data.message}</p>}
            </div>

            <div>
              <label htmlFor="horario" className="block text-sm font-medium text-gray-700 mb-2">
                Horário *
              </label>
              <input
                {...register('horario')}
                type="time"
                id="horario"
                aria-invalid={!!errors.horario}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors ${
                  errors.horario ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.horario && (
                <p className="mt-1 text-sm text-red-600">{errors.horario.message}</p>
              )}
            </div>
          </div>

          {/* Local */}
          <div>
            <label htmlFor="local" className="block text-sm font-medium text-gray-700 mb-2">
              Local *
            </label>
            <input
              {...register('local')}
              type="text"
              id="local"
              aria-invalid={!!errors.local}
              placeholder="Ex: Fórum Central - Sala 101"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors ${
                errors.local ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.local && <p className="mt-1 text-sm text-red-600">{errors.local.message}</p>}
          </div>

          {/* Posto/Nome Policial */}
          <div>
            <label htmlFor="policial" className="block text-sm font-medium text-gray-700 mb-2">
              Posto/Nome Policial *
            </label>
            <input
              {...register('policial')}
              type="text"
              id="policial"
              aria-invalid={!!errors.policial}
              placeholder="Ex: Sgt. João Silva"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors ${
                errors.policial ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.policial && (
              <p className="mt-1 text-sm text-red-600">{errors.policial.message}</p>
            )}
          </div>

          {/* Modalidade */}
          <div>
            <label htmlFor="modalidade" className="block text-sm font-medium text-gray-700 mb-2">
              Modalidade *
            </label>

            {!showCustomModalidade ? (
              <select
                id="modalidade"
                {...modalidadeRegister}
                value={modalidadeValue || ''}
                onChange={(e) => {
                  modalidadeRegister.onChange(e);
                  handleModalidadeChange(e.target.value);
                }}
                aria-invalid={!!errors.modalidade}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors ${
                  errors.modalidade ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">Selecione uma modalidade</option>
                {modalidadesPadrao.map((modalidade) => (
                  <option key={modalidade} value={modalidade}>
                    {modalidade}
                  </option>
                ))}
                <option value="custom">+ Adicionar nova modalidade</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  {...modalidadeRegister}
                  value={customModalidade}
                  onChange={(e) => {
                    setCustomModalidade(e.target.value);
                    setValue('modalidade', e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                  placeholder="Digite a nova modalidade"
                  aria-invalid={!!errors.modalidade}
                  className={`flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors ${
                    errors.modalidade ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomModalidade(false);
                    setCustomModalidade('');
                    setValue('modalidade', '', { shouldValidate: true, shouldDirty: true });
                  }}
                  className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {errors.modalidade && (
              <p className="mt-1 text-sm text-red-600">{errors.modalidade.message}</p>
            )}
          </div>

          {/* SEI */}
          <div>
            <label htmlFor="sei" className="block text-sm font-medium text-gray-700 mb-2">
              SEI (Opcional)
            </label>
            <input
              {...register('sei')}
              type="text"
              id="sei"
              placeholder="Ex: 202500002112972"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent transition-colors"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-cpe-red text-white py-3 px-6 rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cpe-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Audiência
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={loading}
              className="flex-1 sm:flex-initial bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
