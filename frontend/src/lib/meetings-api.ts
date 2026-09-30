import { apiClient } from './api-client';
import type { PaginatedResult } from './work-items-api';
import type {
  Meeting,
  MeetingFrequency,
  MeetingOptions,
  MeetingPoint,
  MeetingPointNote,
  MeetingPointStatus,
  MeetingPointType,
  MeetingStatus,
  MeetingSummary,
  PendingMeetingPoint,
} from '../types/meeting';

export interface MeetingsQuery {
  status?: MeetingStatus;
  search?: string;
  when?: 'upcoming' | 'past' | 'all';
}

export async function fetchMeetings(query: MeetingsQuery = {}): Promise<MeetingSummary[]> {
  const { data } = await apiClient.get<PaginatedResult<MeetingSummary>>('/meetings', {
    params: { pageSize: 100, ...query, search: query.search || undefined },
  });
  return data.data;
}

export async function fetchMeeting(id: string): Promise<Meeting> {
  const { data } = await apiClient.get<Meeting>(`/meetings/${id}`);
  return data;
}

export async function fetchMeetingOptions(): Promise<MeetingOptions> {
  const { data } = await apiClient.get<MeetingOptions>('/meetings/options');
  return data;
}

export interface ParticipantInput {
  userId?: string;
  name?: string;
}

export interface PointPayload {
  title: string;
  description?: string | null;
  type?: MeetingPointType;
  status?: MeetingPointStatus;
  resolution?: string | null;
  responsibleId?: string | null;
  dueDate?: string | null;
}

export interface MeetingPayload {
  title: string;
  area?: string | null;
  description?: string | null;
  location?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  frequency?: MeetingFrequency;
  status?: MeetingStatus;
  minutesNotes?: string | null;
  participants?: ParticipantInput[];
  points?: PointPayload[];
  previousMeetingId?: string | null;
  carryOverPending?: boolean;
}

export async function createMeeting(payload: MeetingPayload): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>('/meetings', payload);
  return data;
}

export async function updateMeeting(id: string, payload: Partial<MeetingPayload>): Promise<Meeting> {
  const { data } = await apiClient.patch<Meeting>(`/meetings/${id}`, payload);
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  await apiClient.delete(`/meetings/${id}`);
}

export async function finishMeeting(id: string, minutesNotes?: string): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>(`/meetings/${id}/finish`, { minutesNotes });
  return data;
}

export async function updateAttendance(
  id: string,
  items: { participantId: string; attended: boolean | null }[],
): Promise<Meeting> {
  const { data } = await apiClient.patch<Meeting>(`/meetings/${id}/attendance`, { items });
  return data;
}

export async function carryOverPoints(id: string, fromMeetingId: string) {
  const { data } = await apiClient.post<{ carried: number; meeting: Meeting }>(
    `/meetings/${id}/carry-over`,
    { fromMeetingId },
  );
  return data;
}

export async function createPoint(meetingId: string, payload: PointPayload): Promise<MeetingPoint> {
  const { data } = await apiClient.post<MeetingPoint>(`/meetings/${meetingId}/points`, payload);
  return data;
}

export async function reorderPoints(meetingId: string, pointIds: string[]): Promise<Meeting> {
  const { data } = await apiClient.post<Meeting>(`/meetings/${meetingId}/points/reorder`, {
    pointIds,
  });
  return data;
}

export async function updatePoint(pointId: string, payload: Partial<PointPayload>): Promise<MeetingPoint> {
  const { data } = await apiClient.patch<MeetingPoint>(`/meeting-points/${pointId}`, payload);
  return data;
}

export async function deletePoint(pointId: string): Promise<void> {
  await apiClient.delete(`/meeting-points/${pointId}`);
}

export async function addPointNote(pointId: string, text: string): Promise<MeetingPointNote> {
  const { data } = await apiClient.post<MeetingPointNote>(`/meeting-points/${pointId}/notes`, {
    text,
  });
  return data;
}

export async function createWorkItemFromPoint(
  pointId: string,
  payload: { moduleId: string; type?: string; priority?: string },
): Promise<MeetingPoint> {
  const { data } = await apiClient.post<MeetingPoint>(
    `/meeting-points/${pointId}/work-item`,
    payload,
  );
  return data;
}

export async function fetchPendingPoints(responsibleId?: string): Promise<PendingMeetingPoint[]> {
  const { data } = await apiClient.get<PendingMeetingPoint[]>('/meeting-points/pending', {
    params: { responsibleId: responsibleId || undefined },
  });
  return data;
}

export interface GenerateWorkItemInput {
  pointId: string;
  moduleId: string;
  type?: string;
  priority?: string;
  assignedToId?: string | null;
}

export async function generateWorkItems(meetingId: string, items: GenerateWorkItemInput[]) {
  const { data } = await apiClient.post<{ created: number; meeting: Meeting }>(
    `/meetings/${meetingId}/work-items`,
    { items },
  );
  return data;
}

export interface MeetingUser {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export async function fetchMeetingUsers(): Promise<MeetingUser[]> {
  const { data } = await apiClient.get<MeetingUser[]>('/meeting-users');
  return data;
}

export async function createMeetingUser(payload: {
  fullName: string;
  email: string;
  password: string;
}): Promise<MeetingUser> {
  const { data } = await apiClient.post<MeetingUser>('/meeting-users', payload);
  return data;
}
