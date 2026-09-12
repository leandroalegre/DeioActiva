export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK' | 'DELAYED';

export interface MilestoneWorkItemRef {
  id: string;
  title: string;
  status: string;
  progressPercentage: number;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string | null;
  dueDate: string;
  status: MilestoneStatus;
  createdAt: string;
  workItems?: MilestoneWorkItemRef[];
}

export const MILESTONE_STATUSES: { value: MilestoneStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pendiente', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'IN_PROGRESS', label: 'En curso', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'AT_RISK', label: 'En riesgo', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'DELAYED', label: 'Demorado', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'COMPLETED', label: 'Completado', color: 'bg-green-100 text-green-700 border-green-200' },
];
