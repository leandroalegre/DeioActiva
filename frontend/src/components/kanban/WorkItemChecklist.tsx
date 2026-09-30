import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from '../../lib/work-items-api';
import { getApiErrorMessage } from '../../lib/api-client';
import type { WorkItem, WorkItemChecklistItem } from '../../types/work-item';
import { checklistProgress, parseChecklistLines } from '../../lib/work-item-extras';

export function ChecklistProgressBar({ items }: { items: WorkItemChecklistItem[] | undefined }) {
  const { total, done, percent } = checklistProgress(items);
  if (!total) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${done === total ? 'bg-emerald-500' : 'bg-brand-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-slate-500">
        {done}/{total}
      </span>
    </div>
  );
}

// Seccion "Checklist" del detalle de la tarea: los desarrolladores tildan cada punto a medida
// que lo resuelven. El cambio se ve al instante (optimista) y queda registrado quien lo tildo.
export function WorkItemChecklistSection({ item }: { item: WorkItem }) {
  const queryClient = useQueryClient();
  const [newText, setNewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const items = item.checklistItems ?? [];

  function patchCache(update: (list: WorkItemChecklistItem[]) => WorkItemChecklistItem[]) {
    queryClient.setQueryData<WorkItem[]>(['work-items'], (old) =>
      old?.map((w) =>
        w.id === item.id ? { ...w, checklistItems: update(w.checklistItems ?? []) } : w,
      ),
    );
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateChecklistItem(item.id, id, { done }),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: ['work-items'] });
      const previous = queryClient.getQueryData<WorkItem[]>(['work-items']);
      patchCache((list) => list.map((i) => (i.id === id ? { ...i, done } : i)));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['work-items'], ctx.previous);
      setError(getApiErrorMessage(err, 'No se pudo actualizar el item.'));
    },
    onSuccess: (saved) => patchCache((list) => list.map((i) => (i.id === saved.id ? saved : i))),
  });

  const addMutation = useMutation({
    mutationFn: async (texts: string[]) => {
      for (const text of texts) await addChecklistItem(item.id, text);
    },
    onSuccess: () => {
      setNewText('');
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo agregar el item.'));
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      updateChecklistItem(item.id, id, { text }),
    onSuccess: (saved) => {
      setEditingId(null);
      patchCache((list) => list.map((i) => (i.id === saved.id ? saved : i)));
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo editar el item.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteChecklistItem(item.id, id),
    onSuccess: (_data, id) => patchCache((list) => list.filter((i) => i.id !== id)),
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo quitar el item.')),
  });

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const texts = parseChecklistLines(newText);
    if (texts.length) addMutation.mutate(texts);
  }

  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Checklist</h3>
      {items.length > 0 && (
        <div className="mb-2">
          <ChecklistProgressBar items={items} />
        </div>
      )}
      {items.length === 0 && (
        <p className="mb-2 text-xs text-slate-400">
          Sin items. Agregá los puntos a resolver para ir tildándolos de a uno.
        </p>
      )}
      <ul className="mb-2 space-y-1">
        {items.map((ci) => (
          <li
            key={ci.id}
            className="group flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={ci.done}
              onChange={(e) => {
                setError(null);
                toggleMutation.mutate({ id: ci.id, done: e.target.checked });
              }}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-emerald-600"
            />
            {editingId === ci.id ? (
              <form
                className="flex flex-1 gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editText.trim()) editMutation.mutate({ id: ci.id, text: editText.trim() });
                }}
              >
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                  className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  Guardar
                </button>
              </form>
            ) : (
              <div className="min-w-0 flex-1">
                <p
                  className={`whitespace-pre-wrap break-words text-sm ${
                    ci.done ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}
                >
                  {ci.text}
                </p>
                {ci.done && ci.doneByName && (
                  <p className="text-[11px] text-slate-400">
                    ✔ {ci.doneByName}
                    {ci.doneAt ? ` · ${new Date(ci.doneAt).toLocaleString('es-AR')}` : ''}
                  </p>
                )}
              </div>
            )}
            {editingId !== ci.id && (
              <div className="hidden shrink-0 gap-1 group-hover:flex">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(ci.id);
                    setEditText(ci.text);
                  }}
                  title="Editar"
                  className="rounded px-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(ci.id)}
                  title="Quitar"
                  className="rounded px-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onPaste={(e) => {
            // Pegar varias lineas agrega un item por linea.
            const pasted = e.clipboardData.getData('text');
            if (pasted.includes('\n')) {
              e.preventDefault();
              const texts = parseChecklistLines(pasted);
              if (texts.length) addMutation.mutate(texts);
            }
          }}
          placeholder="Nuevo item (o pegá una lista)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={addMutation.isPending || !newText.trim()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          Agregar
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
