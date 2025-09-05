import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  format,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

export interface Agenda {
  id?: string;
  startsAt: Timestamp;
  dataStr: string;
  horario: string;
  local: string;
  policial: string;
  modalidade: string;
  sei: string;
  // Campos normalizados para busca
  local_n: string;
  policial_n: string;
  modalidade_n: string;
  sei_n: string;
  keywords: string[];
  // Metadados
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AgendaFormData {
  data: string;     // yyyy-MM-dd
  horario: string;  // HH:mm
  local: string;
  policial: string;
  modalidade: string;
  sei: string;
}

// Normaliza texto para busca
const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// Gera keywords para busca (tokens + campos completos normalizados)
const generateKeywords = (agenda: Partial<Agenda>): string[] => {
  const fields = [
    agenda.local || '',
    agenda.policial || '',
    agenda.modalidade || '',
    agenda.sei || '',
    agenda.dataStr || '',
    agenda.horario || '',
  ];

  const keywords: string[] = [];
  for (const field of fields) {
    if (!field || !field.trim()) continue;
    const n = normalizeText(field);
    keywords.push(...n.split(/\s+/));
    keywords.push(n);
  }
  return Array.from(new Set(keywords.filter(Boolean)));
};

// Converte dados do formulário para documento Firestore
export const formDataToAgenda = (
  formData: AgendaFormData,
  userId: string
): Omit<Agenda, 'id'> => {
  const [year, month, day] = formData.data.split('-').map(Number);
  const [hours, minutes] = formData.horario.split(':').map(Number);

  const date = new Date(year, month - 1, day);
  const startsAt = Timestamp.fromDate(setMinutes(setHours(date, hours), minutes));
  const dataStr = format(date, 'yyyy-MM-dd');

  const base: Partial<Agenda> = {
    startsAt,
    dataStr,
    horario: formData.horario,
    local: formData.local.trim(),
    policial: formData.policial.trim(),
    modalidade: formData.modalidade.trim(),
    sei: formData.sei.trim(),
    local_n: normalizeText(formData.local),
    policial_n: normalizeText(formData.policial),
    modalidade_n: normalizeText(formData.modalidade),
    sei_n: normalizeText(formData.sei),
    createdByUid: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  return {
    ...(base as Omit<Agenda, 'id'>),
    keywords: generateKeywords(base),
  };
};

// Buscar agendas com paginação
export const getAgendas = async (
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  pageSize: number = 20
) => {
  const agendasRef = collection(db, 'agendas');
  let qy = query(agendasRef, orderBy('startsAt', 'asc'), limit(pageSize));

  if (lastDoc) {
    qy = query(agendasRef, orderBy('startsAt', 'asc'), startAfter(lastDoc), limit(pageSize));
  }

  const snapshot = await getDocs(qy);
  const agendas = snapshot.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
      } as Agenda)
  );

  return {
    agendas,
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
    hasMore: snapshot.docs.length === pageSize,
  };
};

// Filtros por data (range genérico)
export const getAgendasByDateRange = async (startDate: Date, endDate: Date) => {
  const agendasRef = collection(db, 'agendas');
  const qy = query(
    agendasRef,
    where('startsAt', '>=', Timestamp.fromDate(startOfDay(startDate))),
    where('startsAt', '<=', Timestamp.fromDate(endOfDay(endDate))),
    orderBy('startsAt', 'asc')
  );

  const snapshot = await getDocs(qy);
  return snapshot.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
      } as Agenda)
  );
};

// Filtros rápidos
export const getAgendasToday = () => {
  const today = new Date();
  return getAgendasByDateRange(today, today);
};

export const getAgendasThisWeek = () => {
  const today = new Date();
  return getAgendasByDateRange(startOfWeek(today), endOfWeek(today));
};

export const getAgendasThisMonth = () => {
  const today = new Date();
  return getAgendasByDateRange(startOfMonth(today), endOfMonth(today));
};

/**
 * Busca agendas por mês/ano específicos diretamente no Firestore.
 * - month1to12: 1=Jan ... 12=Dez
 * - Usa range em `startsAt` + orderBy no mesmo campo (não precisa índice composto).
 */
export const getAgendasByMonth = async (year: number, month1to12: number) => {
  const monthStart = new Date(year, month1to12 - 1, 1, 0, 0, 0, 0); // inclusive
  const nextMonthStart = new Date(year, month1to12, 1, 0, 0, 0, 0); // exclusivo

  const agendasRef = collection(db, 'agendas');
  const qy = query(
    agendasRef,
    where('startsAt', '>=', Timestamp.fromDate(monthStart)),
    where('startsAt', '<', Timestamp.fromDate(nextMonthStart)),
    orderBy('startsAt', 'asc')
  );

  const snap = await getDocs(qy);
  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...(d.data() as any),
      } as Agenda)
  );
};

// CRUD operations
export const createAgenda = async (agendaData: Omit<Agenda, 'id'>) => {
  const agendasRef = collection(db, 'agendas');
  return addDoc(agendasRef, agendaData);
};

/**
 * Atualiza parcialmente um documento de agenda.
 * - Suporta alteração parcial de data e/ou horário (se apenas um vier, usa o outro do doc atual).
 * - Sempre regenera `keywords` baseado no documento mesclado (doc atual + updates).
 */
export const updateAgenda = async (
  id: string,
  agendaData: Partial<AgendaFormData>,
  userId: string
) => {
  if (!agendaData) return;

  const agendaRef = doc(db, 'agendas', id);
  const snap = await getDoc(agendaRef);
  if (!snap.exists()) return;

  const current = snap.data() as Agenda;

  // Mescla campos textuais simples (com normalizações)
  const merged: Partial<Agenda> = {
    ...current,
    updatedAt: Timestamp.now(),
  };

  if (agendaData.local !== undefined) {
    merged.local = agendaData.local.trim();
    merged.local_n = normalizeText(agendaData.local);
  }
  if (agendaData.policial !== undefined) {
    merged.policial = agendaData.policial.trim();
    merged.policial_n = normalizeText(agendaData.policial);
  }
  if (agendaData.modalidade !== undefined) {
    merged.modalidade = agendaData.modalidade.trim();
    merged.modalidade_n = normalizeText(agendaData.modalidade);
  }
  if (agendaData.sei !== undefined) {
    merged.sei = agendaData.sei.trim();
    merged.sei_n = normalizeText(agendaData.sei);
  }

  // Data/horário (permite atualizar só um dos dois)
  const nextDateStr = agendaData.data ?? current.dataStr;       // yyyy-MM-dd
  const nextHorario = agendaData.horario ?? current.horario;    // HH:mm

  if (nextDateStr || nextHorario) {
    // Constrói Date com base nos valores "próximos"
    const [y, m, d] = (nextDateStr ?? current.dataStr).split('-').map(Number);
    const [hh, mm] = (nextHorario ?? current.horario).split(':').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    merged.startsAt = Timestamp.fromDate(setMinutes(setHours(dt, hh || 0), mm || 0));
    merged.dataStr = format(dt, 'yyyy-MM-dd');
    merged.horario = `${`${hh}`.padStart(2, '0')}:${`${mm}`.padStart(2, '0')}`;
  }

  // Regenerar keywords sempre que houver mudanças relevantes
  merged.keywords = generateKeywords({
    dataStr: merged.dataStr ?? current.dataStr,
    horario: merged.horario ?? current.horario,
    local: merged.local ?? current.local,
    policial: merged.policial ?? current.policial,
    modalidade: merged.modalidade ?? current.modalidade,
    sei: merged.sei ?? current.sei,
  });

  // Envia apenas os campos alterados
  const {
    id: _omitId,
    createdAt: _omitCreatedAt,
    createdByUid: _omitCreatedBy,
    ...payload
  } = merged;

  return updateDoc(agendaRef, payload);
};

export const deleteAgenda = async (id: string) => {
  const agendaRef = doc(db, 'agendas', id);
  return deleteDoc(agendaRef);
};
