import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ACCEPTED_IMAGE_TYPES,
  createWorkItem,
  deleteWorkItem,
  updateWorkItem,
  uploadWorkItemImage,
} from '../../lib/work-items-api';
import { fetchModuleTree, flattenModules } from '../../lib/modules-api';
import { fetchMilestones } from '../../lib/milestones-api';
import { getApiErrorMessage } from '../../lib/api-client';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_TYPES } from '../../types/work-item';
import type { WorkItem, WorkItemPriority, WorkItemType } from '../../types/work-item';
import {
  imagesFromClipboard,
  parseChecklistLines,
  validateImageFile,
} from '../../lib/work-item-extras';

// Miniaturas de las imagenes elegidas antes de crear la tarea (todavia no subidas).
function PendingImages({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200"
          title={f.name}
        >
          <img src={urls[i]} alt={f.name} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            title="Quitar"
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// Modal de creacion/edicion de una tarea (WorkItem). Antes solo existia NewWorkItemModal
// (crear); se unifico con edicion a pedido del usuario ("no me deja editar una tarea"),
// siguiendo el mismo patron create+edit que ya usan Modulos/Usuarios/Hitos.
// Tambien permite asociar la tarea a un Hito (opcional), para el seguimiento de progreso
// por hito en el Roadmap.
export function WorkItemFormModal({
  workItem,
  onClose,
}: {
  workItem?: WorkItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(workItem);

  const { data: moduleTree } = useQuery({ queryKey: ['modules'], queryFn: fetchModuleTree });
  const moduleOptions = flattenModules(moduleTree ?? []);
  const { data: milestones } = useQuery({ queryKey: ['milestones'], queryFn: fetchMilestones });

  const [title, setTitle] = useState(workItem?.title ?? '');
  const [moduleId, setModuleId] = useState(workItem?.moduleId ?? '');
  const [type, setType] = useState<WorkItemType>(workItem?.type ?? 'TASK');
  const [priority, setPriority] = useState<WorkItemPriority>(workItem?.priority ?? 'MEDIUM');
  const [description, setDescription] = useState(workItem?.description ?? '');
  const [plannedStart, setPlannedStart] = useState(workItem?.plannedStart?.slice(0, 10) ?? '');
  const [plannedEnd, setPlannedEnd] = useState(workItem?.plannedEnd?.slice(0, 10) ?? '');
  const [dueDate, setDueDate] = useState(workItem?.dueDate?.slice(0, 10) ?? '');
  const [milestoneId, setMilestoneId] = useState(workItem?.milestoneId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Solo en alta: checklist e imagenes. En edicion se gestionan desde el detalle de la tarea.
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistInput, setChecklistInput] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function addChecklistText(text: string) {
    const lines = parseChecklistLines(text);
    if (lines.length) setChecklist((prev) => [...prev, ...lines]);
  }

  function addImages(files: File[]) {
    const problems = files.map(validateImageFile).filter((p): p is string => Boolean(p));
    setError(problems.length ? problems.join(' ') : null);
    const valid = files.filter((f) => !validateImageFile(f));
    if (valid.length) setImages((prev) => [...prev, ...valid].slice(0, 10));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        moduleId,
        type,
        priority,
        description: description || undefined,
        plannedStart: plannedStart || undefined,
        plannedEnd: plannedEnd || undefined,
        dueDate: dueDate || undefined,
        milestoneId: milestoneId || null,
      };
      if (isEditing) {
        await updateWorkItem(workItem!.id, payload);
        return [] as string[];
      }
      // Lo que quedo escrito en el campo del checklist sin apretar "Agregar" tambien se guarda.
      const pendingLines = parseChecklistLines(checklistInput);
      const created = await createWorkItem({ ...payload, checklist: [...checklist, ...pendingLines] });
      // Las imagenes se suben despues de crear la tarea; si alguna falla, la tarea queda creada
      // igual y se avisa cual no se pudo subir (se puede reintentar desde el detalle).
      const failures: string[] = [];
      for (const file of images) {
        try {
          await uploadWorkItemImage(created.id, file);
        } catch (err) {
          failures.push(getApiErrorMessage(err, `No se pudo subir "${file.name}".`));
        }
      }
      return failures;
    },
    onSuccess: (failures) => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      if (failures.length) {
        setUploadWarning(
          `La tarea se creó, pero hubo problemas con las imágenes: ${failures.join(' ')} Podés volver a adjuntarlas desde el detalle de la tarea.`,
        );
        return;
      }
      onClose();
    },
    onError: () => setError('No se pudo guardar la tarea. Revisá los datos e intentá de nuevo.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkItem(workItem!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo eliminar la tarea. Intentá de nuevo.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!moduleId) {
      setError('Elegí un módulo.');
      return;
    }
    if (plannedStart && plannedEnd && plannedEnd < plannedStart) {
      setError('La fecha de fin planificada no puede ser anterior a la de inicio.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onPaste={(e) => {
          if (isEditing) return;
          const files = imagesFromClipboard(e);
          if (files.length) {
            e.preventDefault();
            addImages(files);
          }
        }}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {isEditing ? 'Editar tarea' : 'Nueva tarea'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Módulo</label>
            <select
              required
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Elegir...</option>
              {moduleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkItemType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {WORK_ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {WORK_ITEM_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Hito asociado (opcional)
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Sin hito</option>
              {milestones?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Si esta tarea es parte de un hito del Roadmap, elegilo acá para que cuente en su
              progreso.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Descripción (opcional)
            </label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Checklist (opcional)
              </label>
              {checklist.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {checklist.map((text, i) => (
                    <li
                      key={`${i}-${text}`}
                      className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-1 text-sm text-slate-700"
                    >
                      <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded border border-slate-300 bg-white" />
                      <span className="flex-1 break-words">{text}</span>
                      <button
                        type="button"
                        onClick={() => setChecklist((prev) => prev.filter((_, idx) => idx !== i))}
                        title="Quitar"
                        className="text-xs text-slate-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistText(checklistInput);
                      setChecklistInput('');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted.includes('\n')) {
                      e.preventDefault();
                      addChecklistText(pasted);
                    }
                  }}
                  placeholder="Escribí un item y Enter"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    addChecklistText(checklistInput);
                    setChecklistInput('');
                  }}
                  disabled={!checklistInput.trim()}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Agregar
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Un item por punto a resolver; los desarrolladores los van tildando desde el
                detalle de la tarea. Si pegás una lista, se agrega un item por línea.
              </p>
            </div>
          )}

          {!isEditing && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Imágenes (opcional)
              </label>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50"
              >
                📎 Adjuntar imagen — o pegala con Ctrl+V
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                multiple
                className="hidden"
                onChange={(e) => {
                  addImages(Array.from(e.target.files ?? []));
                  e.target.value = '';
                }}
              />
              {images.length > 0 && (
                <PendingImages
                  files={images}
                  onRemove={(index) => setImages((prev) => prev.filter((_, i) => i !== index))}
                />
              )}
              <p className="mt-1 text-xs text-slate-400">PNG, JPG, GIF o WEBP, hasta 5 MB c/u.</p>
            </div>
          )}

          {isEditing && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              El checklist y las imágenes se editan desde el detalle de la tarea (click en la
              tarjeta).
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Inicio planificado (opcional)
              </label>
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fin planificado (opcional)
              </label>
              <input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-400">
            Cargá estas dos fechas para que la tarea aparezca en la vista Gantt.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Fecha límite (opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Distinta del fin planificado: si se pasa esta fecha y la tarea no está
              Completada/Descartada, la tarjeta del Kanban se marca como Vencida.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {uploadWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {uploadWarning}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {isEditing && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar tarea
                </button>
              )}
              {isEditing && confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">¿Eliminar? No se puede deshacer.</span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || Boolean(uploadWarning)}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {mutation.isPending
                  ? images.length > 0 && !isEditing
                    ? 'Creando y subiendo imágenes...'
                    : 'Guardando...'
                  : isEditing ? 'Guardar cambios' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
