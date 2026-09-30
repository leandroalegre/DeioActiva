import type { WorkItemType } from './work-item';

export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type MeetingFrequency = 'UNIQUE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ON_DEMAND';
export type MeetingPointType = 'TOPIC' | 'REQUIREMENT' | 'ACTION' | 'DECISION' | 'FOLLOW_UP' | 'NOTE';
export type MeetingPointStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'POSTPONED' | 'CANCELLED';

export interface UserRef {
  id: string;
  fullName: string;
  email: string;
}

export interface MeetingRef {
  id: string;
  title: string;
  date: string;
  area?: string | null;
}

export interface MeetingParticipant {
  id: string;
  userId?: string | null;
  user?: UserRef | null;
  name: string;
  attended: boolean | null;
}

export interface MeetingPointNote {
  id: string;
  text: string;
  createdAt: string;
  author: UserRef;
}

export interface MeetingPoint {
  id: string;
  meetingId: string;
  order: number;
  title: string;
  description?: string | null;
  type: MeetingPointType;
  status: MeetingPointStatus;
  resolution?: string | null;
  responsibleId?: string | null;
  responsible?: UserRef | null;
  dueDate?: string | null;
  workItemId?: string | null;
  workItem?: { id: string; title: string; status: string; progressPercentage?: number } | null;
  carriedFrom?: { id: string; meeting: MeetingRef } | null;
  carriedTo?: { id: string; meeting: MeetingRef } | null;
  notes: MeetingPointNote[];
  createdAt: string;
  updatedAt: string;
}

export interface PendingMeetingPoint extends Omit<MeetingPoint, 'notes' | 'carriedFrom' | 'carriedTo'> {
  meeting: MeetingRef;
  _count: { notes: number };
}

export interface MeetingSummary {
  id: string;
  title: string;
  area?: string | null;
  description?: string | null;
  location?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  frequency: MeetingFrequency;
  status: MeetingStatus;
  finishedAt?: string | null;
  previousMeetingId?: string | null;
  participants: { id: string; name: string; attended: boolean | null; userId?: string | null }[];
  pointsSummary: { total: number; resolved: number; open: number; overdue: number };
}

export interface Meeting extends Omit<MeetingSummary, 'participants' | 'pointsSummary'> {
  minutesNotes?: string | null;
  createdBy?: UserRef | null;
  createdAt: string;
  participants: MeetingParticipant[];
  points: MeetingPoint[];
  previousMeeting?: MeetingRef | null;
  nextMeetings: MeetingRef[];
}

export interface MeetingOptions {
  users: (UserRef & { role?: { code: string } })[];
  modules: { id: string; name: string; parentId?: string | null }[];
}

type Meta<T extends string> = { value: T; label: string; color: string };

export const MEETING_STATUSES: Meta<MeetingStatus>[] = [
  { value: 'SCHEDULED', label: 'Programada', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'IN_PROGRESS', label: 'En curso', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'FINISHED', label: 'Finalizada', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'CANCELLED', label: 'Cancelada', color: 'bg-slate-100 text-slate-500 border-slate-200' },
];

export const MEETING_FREQUENCIES: { value: MeetingFrequency; label: string }[] = [
  { value: 'UNIQUE', label: 'Única' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'ON_DEMAND', label: 'A demanda' },
];

export const POINT_TYPES: Meta<MeetingPointType>[] = [
  { value: 'TOPIC', label: 'Tema', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'REQUIREMENT', label: 'Requerimiento', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'ACTION', label: 'Acción', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'DECISION', label: 'Decisión', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'FOLLOW_UP', label: 'Seguimiento', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'NOTE', label: 'Nota', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
];

export const POINT_STATUSES: Meta<MeetingPointStatus>[] = [
  { value: 'PENDING', label: 'Pendiente', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'IN_PROGRESS', label: 'En curso', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'RESOLVED', label: 'Resuelto', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'POSTPONED', label: 'Postergado', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'CANCELLED', label: 'Descartado', color: 'bg-slate-100 text-slate-400 border-slate-200' },
];

export const OPEN_POINT_STATUSES: MeetingPointStatus[] = ['PENDING', 'IN_PROGRESS', 'POSTPONED'];

export function metaOf<T extends string>(list: Meta<T>[], value: T): Meta<T> {
  return list.find((m) => m.value === value) ?? list[0];
}

export function frequencyLabel(value: MeetingFrequency) {
  return MEETING_FREQUENCIES.find((f) => f.value === value)?.label ?? value;
}

// Fechas "solo dia" guardadas a medianoche UTC: se formatean en UTC para no correrse un dia
// en Argentina (UTC-3), igual que en Roadmap.
export function formatDay(iso?: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...opts,
  });
}

export function todayKey() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isPointOverdue(p: { status: MeetingPointStatus; dueDate?: string | null }) {
  if (!p.dueDate || !OPEN_POINT_STATUSES.includes(p.status)) return false;
  return p.dueDate.slice(0, 10) < todayKey();
}

// Puntos que por su tipo suelen generar una tarea (se pre-tildan en "Generar tareas").
export const ACTIONABLE_POINT_TYPES: MeetingPointType[] = ['REQUIREMENT', 'ACTION', 'FOLLOW_UP'];

// Tipo de tarea del Kanban propuesto segun el tipo de punto (espejo del backend,
// meeting-point-sync.ts).
export const POINT_TYPE_TO_WORK_ITEM_TYPE: Record<MeetingPointType, WorkItemType> = {
  REQUIREMENT: 'REQUIREMENT',
  ACTION: 'TASK',
  FOLLOW_UP: 'ANALYSIS',
  DECISION: 'TASK',
  TOPIC: 'TASK',
  NOTE: 'TASK',
};

// Punto que conviene convertir en tarea: accionable, sin tarea y todavia abierto.
export function needsWorkItem(p: { type: MeetingPointType; status: MeetingPointStatus; workItemId?: string | null }) {
  return !p.workItemId && ACTIONABLE_POINT_TYPES.includes(p.type) && OPEN_POINT_STATUSES.includes(p.status);
}

// Ordena los modulos como arbol (cada submodulo debajo de su padre) para los selectores.
// La API los devuelve planos, ordenados por "order"/nombre, y los hijos quedaban mezclados.
export function modulesAsTree(modules: MeetingOptions['modules']) {
  const byParent = new Map<string | null, MeetingOptions['modules']>();
  for (const m of modules) {
    const key = m.parentId && modules.some((x) => x.id === m.parentId) ? m.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), m]);
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const m of byParent.get(parentId) ?? []) {
      out.push({ id: m.id, label: `${'— '.repeat(depth)}${m.name}` });
      walk(m.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
