import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Filter, MapPin, User, FileText, Clock, Edit, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  Agenda,
  getAgendas,
  getAgendasToday,
  getAgendasThisWeek,
  getAgendasByMonth, // <-- IMPORTE ADICIONADO
  deleteAgenda
} from '../lib/firestore';
import { useDebounce, addToast } from '../lib/utils';

// Firestore (para salvar os registros importados)
import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

type FilterType = 'all' | 'today' | 'week' | 'month';

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const ANOS = [2025, 2026, 2027, 2028, 2029, 2030];

export const Home: React.FC = () => {
  const { role, user } = useAuth();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [filteredAgendas, setFilteredAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // novos estados de mês/ano
  const now = new Date();
  const defaultYear = Math.min(Math.max(now.getFullYear(), 2025), 2030);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ---------------- CSV helpers ----------------
  const normalize = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  function parseCSV(text: string, delimiter?: string): string[][] {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const guessed = delimiter
      ? delimiter
      : (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0)
      ? ';'
      : ',';

    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"') {
        if (quoted && next === '"') {
          cell += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (ch === guessed && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !quoted) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        if (ch === '\r') i++;
      } else {
        cell += ch;
      }
    }
    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }
    return rows
      .map(r => r.map(c => c.trim()))
      .filter(r => r.length && r.some(c => c.length > 0));
  }

  function mapHeaders(headers: string[]) {
    const hNorm = headers.map(h => normalize(h));
    const find = (targets: string[]) => {
      const idx = hNorm.findIndex(h => targets.includes(h));
      return idx >= 0 ? idx : -1;
    };

    return {
      idxData: find(['data', 'data audiencia', 'data da audiencia']),
      idxHorario: find(['horario', 'horário', 'hora', 'hora audiencia']),
      idxLocal: find(['local']),
      idxPolicial: find(['posto/nome policial', 'posto nome policial', 'policial', 'nome policial', 'posto']),
      idxModalidade: find(['modalidade']),
      idxSei: find(['sei', 'n sei', 'numero sei', 'nº sei']),
    };
  }

  function parseDateAndTime(data: string, horario: string): Date | null {
    const d = data.trim();
    const h = horario.trim();
    let year = 0, month = 0, day = 0, hour = 0, minute = 0;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('/');
      day = parseInt(dd, 10);
      month = parseInt(mm, 10);
      year = parseInt(yyyy, 10);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [yyyy, mm, dd] = d.split('-');
      year = parseInt(yyyy, 10);
      month = parseInt(mm, 10);
      day = parseInt(dd, 10);
    } else {
      return null;
    }

    const m = h.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    hour = parseInt(m[1], 10);
    minute = parseInt(m[2], 10);

    const dt = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function pad2(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
  }

  function toYYYYMMDD(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function buildKeywords(o: { local: string; policial: string; modalidade: string; sei?: string; dataStr: string; horario: string; }) {
    const normalized = [
      normalize(o.local),
      normalize(o.policial),
      normalize(o.modalidade),
      normalize(o.sei || ''),
      normalize(o.dataStr),
      normalize(o.horario),
    ].filter(Boolean).join(' ');
    return Array.from(new Set(normalized.split(/\s+/).filter(Boolean)));
  }

  async function handleFileChosen(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        addToast({ type: 'error', message: 'CSV vazio ou inválido.' });
        return;
      }
      const headers = rows[0];
      const { idxData, idxHorario, idxLocal, idxPolicial, idxModalidade, idxSei } = mapHeaders(headers);
      const missing = [
        ['Data', idxData],
        ['Horário', idxHorario],
        ['Local', idxLocal],
        ['Posto/Nome Policial', idxPolicial],
        ['Modalidade', idxModalidade],
      ].filter(([_, idx]) => (idx as number) < 0);

      if (missing.length) {
        addToast({
          type: 'error',
          message: `Cabeçalhos ausentes no CSV: ${missing.map(m => m[0]).join(', ')}`
        });
        return;
      }

      let ok = 0;
      let fail = 0;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const data = r[idxData];
        const horario = r[idxHorario];
        const local = r[idxLocal];
        const policial = r[idxPolicial];
        const modalidade = r[idxModalidade];
        const sei = idxSei >= 0 ? r[idxSei] : '';

        if (!data || !horario || !local || !policial || !modalidade) {
          fail++;
          continue;
        }
        const jsDate = parseDateAndTime(data, horario);
        if (!jsDate) {
          fail++;
          continue;
        }

        const dataStr = toYYYYMMDD(jsDate);
        const keywords = buildKeywords({ local, policial, modalidade, sei, dataStr, horario });

        try {
          await addDoc(collection(db, 'agendas'), {
            startsAt: Timestamp.fromDate(jsDate),
            dataStr,
            horario,
            local,
            policial,
            modalidade,
            sei: sei || '',
            local_n: normalize(local),
            policial_n: normalize(policial),
            modalidade_n: normalize(modalidade),
            sei_n: normalize(sei || ''),
            keywords,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdByUid: user?.uid || null,
          });
          ok++;
        } catch (e) {
          console.error('Erro ao gravar linha', i + 1, e);
          fail++;
        }
      }

      addToast({
        type: fail ? 'warning' : 'success',
        message: `Importação concluída: ${ok} registro(s) criado(s) ${fail ? `| ${fail} falha(s)` : ''}`
      });

      await loadAgendas(activeFilter);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ----------------------------------------------

  // Carregar agendas (agora suporta mês/ano)
  const loadAgendas = async (filter: FilterType, year = selectedYear, month = selectedMonth) => {
    setLoading(true);
    try {
      let result: Agenda[] = [];

      switch (filter) {
        case 'today':
          result = await getAgendasToday();
          break;

        case 'week':
          result = await getAgendasThisWeek();
          break;

        case 'month':
          // 🔴 Busca DIRETAMENTE no Firestore todas as agendas do mês/ano
          result = await getAgendasByMonth(year, month);
          break;

        default:
          // Lista geral (paginada no helper). Se quiser tudo, ajuste getAgendas para paginação contínua.
          {
            const { agendas } = await getAgendas();
            result = agendas;
          }
      }

      setAgendas(result);
    } catch (error) {
      console.error('Error loading agendas:', error);
      addToast({ type: 'error', message: 'Erro ao carregar agendas' });
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar dados iniciais e também quando alterar mês/ano (se filtro = month)
  useEffect(() => {
    loadAgendas(activeFilter, selectedYear, selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, selectedMonth, selectedYear]);

  // Efeito para filtrar agendas (texto e modalidade)
  useEffect(() => {
    let filtered = agendas;

    // Filtro por texto de busca
    if (debouncedSearchTerm.trim()) {
      const searchLower = normalize(debouncedSearchTerm);
      filtered = filtered.filter(agenda =>
        agenda.keywords.some(keyword => keyword.includes(searchLower)) ||
        agenda.dataStr.includes(searchLower) ||
        agenda.horario.includes(searchLower)
      );
    }

    // Filtro por modalidades selecionadas
    if (selectedModalidades.length > 0) {
      filtered = filtered.filter(agenda =>
        selectedModalidades.includes(agenda.modalidade)
      );
    }

    setFilteredAgendas(filtered);
  }, [agendas, debouncedSearchTerm, selectedModalidades]);

  // Modalidades únicas
  const modalidades = [...new Set(agendas.map(a => a.modalidade))].sort();

  // Agrupar por data
  const groupedAgendas = filteredAgendas.reduce((groups, agenda) => {
    const date = agenda.startsAt.toDate();
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(agenda);
    return groups;
  }, {} as Record<string, Agenda[]>);

  // Ordenar datas
  const sortedDates = Object.keys(groupedAgendas).sort();

  // Deletar agenda
  const handleDelete = async (agenda: Agenda) => {
    if (!window.confirm(`Tem certeza que deseja excluir a audiência de ${format(agenda.startsAt.toDate(), 'dd/MM/yyyy HH:mm')}?`)) {
      return;
    }
    try {
      await deleteAgenda(agenda.id!);
      setAgendas(prev => prev.filter(a => a.id !== agenda.id));
      addToast({ type: 'success', message: 'Audiência excluída com sucesso!' });
    } catch (error) {
      console.error('Error deleting agenda:', error);
      addToast({ type: 'error', message: 'Erro ao excluir audiência' });
    }
  };

  // Toggle modalidade
  const toggleModalidade = (modalidade: string) => {
    setSelectedModalidades(prev =>
      prev.includes(modalidade)
        ? prev.filter(m => m !== modalidade)
        : [...prev, modalidade]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cpe-red"></div>
      </div>
    );
  }

  const monthLabel = MESES.find(m => m.value === selectedMonth)?.label ?? 'Mês';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Audiências</h1>
          <p className="text-gray-600 mt-1">
            {filteredAgendas.length} {filteredAgendas.length === 1 ? 'audiência' : 'audiências'}
            {activeFilter !== 'all' && ' - '}
            {activeFilter === 'today' && 'Hoje'}
            {activeFilter === 'week' && 'Esta semana'}
            {activeFilter === 'month' && `${monthLabel}/${selectedYear}`}
          </p>
        </div>

        {role === 'sad' && (
          <div className="flex items-center gap-2">
            <Link
              to="/cadastro"
              className="inline-flex items-center px-4 py-2 bg-cpe-red text-white rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cpe-red transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Audiência
            </Link>

            {/* Botão Importar CSV */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-60 transition-colors"
              title="Importar CSV para criar registros em massa"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importando...' : 'Importar CSV'}
            </button>

            {/* Input de arquivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChosen(file);
              }}
            />
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por Data, Local, Policial, Modalidade ou SEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red focus:border-transparent"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-700 self-center mr-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            Período:
          </span>

          {[
            { key: 'all', label: 'Todas' },
            { key: 'today', label: 'Hoje' },
            { key: 'week', label: 'Semana' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as FilterType)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-cpe-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}

          {/* seletor de mês/ano */}
          <button
            onClick={() => setActiveFilter('month')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'month' ? 'bg-cpe-red text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mês
          </button>

          {/* Mostra selects quando filtro "month" estiver ativo */}
          {activeFilter === 'month' && (
            <div className="flex flex-wrap items-center gap-2 ml-1">
              <label className="text-sm text-gray-700">Mês:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red"
              >
                {MESES.map(m => (
                  <option value={m.value} key={m.value}>{m.label}</option>
                ))}
              </select>

              <label className="text-sm text-gray-700 ml-2">Ano:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cpe-red"
              >
                {ANOS.map(y => (
                  <option value={y} key={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modalidade Filters */}
        {modalidades.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center mr-2">Modalidades:</span>
            {modalidades.map((modalidade) => (
              <button
                key={modalidade}
                onClick={() => toggleModalidade(modalidade)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedModalidades.includes(modalidade)
                    ? 'bg-cpe-gold text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {modalidade}
              </button>
            ))}
            {selectedModalidades.length > 0 && (
              <button
                onClick={() => setSelectedModalidades([])}
                className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Agendas List */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedModalidades.length > 0 ? 'Nenhuma audiência encontrada' : 'Nenhuma audiência cadastrada'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedModalidades.length > 0
              ? 'Tente ajustar seus filtros de busca'
              : 'Comece adicionando uma nova audiência'
            }
          </p>
          {role === 'sad' && !searchTerm && selectedModalidades.length === 0 && (
            <Link
              to="/cadastro"
              className="inline-flex items-center px-4 py-2 bg-cpe-red text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeira Audiência
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => {
            const date = new Date(dateStr + 'T00:00:00');
            const dayAgendas = groupedAgendas[dateStr].sort((a, b) =>
              a.startsAt.toDate().getTime() - b.startsAt.toDate().getTime()
            );

            return (
              <div key={dateStr} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {isToday(date) && (
                      <span className="ml-2 px-2 py-1 bg-cpe-red text-white text-xs rounded-full">
                        Hoje
                      </span>
                    )}
                  </h2>
                  <div className="flex-1 ml-4 h-px bg-gray-200"></div>
                </div>

                {/* Agendas Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dayAgendas.map((agenda) => (
                    <div
                      key={agenda.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center text-cpe-red">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="font-semibold">{agenda.horario}</span>
                        </div>
                        {role === 'sad' && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {/* TODO: Implement edit */}}
                              className="p-1 text-gray-400 hover:text-cpe-gold transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(agenda)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900 font-medium">{agenda.local}</span>
                        </div>

                        <div className="flex items-start">
                          <User className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{agenda.policial}</span>
                        </div>

                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 flex-shrink-0"></div>
                          <span className="px-2 py-1 bg-cpe-gold bg-opacity-20 text-cpe-gold text-xs rounded-full font-medium">
                            {agenda.modalidade}
                          </span>
                        </div>

                        {agenda.sei && (
                          <div className="flex items-start">
                            <FileText className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-600 font-mono">{agenda.sei}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
