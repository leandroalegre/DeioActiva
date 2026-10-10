import { FormEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ACCEPTED_IMAGE_TYPES,
  createWorkItem,
  uploadWorkItemImage,
} from '../../lib/work-items-api';
import { fetchModuleTree, flattenModules } from '../../lib/modules-api';
import { getApiErrorMessage } from '../../lib/api-client';
import { WORK_ITEM_PRIORITIES } from '../../types/work-item';
import type { WorkItemPriority } from '../../types/work-item';
import { imagesFromClipboard, validateImageFile } from '../../lib/work-item-extras';
import { PendingImages } from './WorkItemFormModal';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

// Formulario simple del perfil QA para reportar un problema encontrado al usar el sistema.
// El reporte entra siempre en la columna "QA / Reportes"; el equipo define la prioridad real,
// el modulo definitivo y a quien se asigna cuando hace el triage.
export function QaReportFormModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { data: moduleTree } = useQuery({ queryKey: ['modules'], queryFn: fetchModuleTree });
  const moduleOptions = flattenModules(moduleTree ?? []);

  const [title, setTitle] = useState('');
  const [establishment, setEstablishment] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [suggestedPriority, setSuggestedPriority] = useState<WorkItemPriority>('MEDIUM');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  function addImages(files: File[]) {
    const problems = files.map(validateImageFile).filter((p): p is string => Boolean(p));
    setError(problems.length ? problems.join(' ') : null);
    const valid = files.filter((f) => !validateImageFile(f));
    if (valid.length) setImages((prev) => [...prev, ...valid].slice(0, 10));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const created = await createWorkItem({
        title: title.trim(),
        type: 'ERROR',
        moduleId: moduleId || undefined,
        establishment: establishment.trim() || undefined,
        suggestedPriority,
        description: description.trim() || undefined,
      });
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
      if (failures.length) {
        setUploadWarning(
          `El reporte se cargó, pero hubo problemas con las capturas: ${failures.join(' ')} Podés volver a adjuntarlas desde el detalle.`,
        );
        return;
      }
      onClose();
    },
    onError: (err) =>
      setError(getApiErrorMessage(err, 'No se pudo cargar el reporte. Intentá de nuevo.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Contá en una línea qué pasó.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onPaste={(e) => {
          const files = imagesFromClipboard(e);
          if (files.length) {
            e.preventDefault();
            addImages(files);
          }
        }}
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Reportar un problema</h2>
        <p className="mb-4 text-xs text-slate-500">
          El reporte queda en la columna “QA / Reportes”. El equipo lo prioriza y vas a poder seguir
          su avance en el tablero.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">¿Qué pasó?</label>
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: al guardar el horario del establecimiento da error"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Establecimiento
              </label>
              <input
                value={establishment}
                onChange={(e) => setEstablishment(e.target.value)}
                placeholder="Nombre del establecimiento"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Severidad sugerida
              </label>
              <select
                value={suggestedPriority}
                onChange={(e) => setSuggestedPriority(e.target.value as WorkItemPriority)}
                className={inputClass}
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
              Sección del sistema (opcional)
            </label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className={inputClass}
            >
              <option value="">No sé / no aplica</option>
              {moduleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Detalle y pasos para reproducirlo
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={'1. Entré a...\n2. Hice click en...\n3. Apareció...'}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Capturas</label>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50"
            >
              📎 Adjuntar captura — o pegala con Ctrl+V
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
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {uploadWarning && (
            <p className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-700">{uploadWarning}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {uploadWarning ? 'Cerrar' : 'Cancelar'}
            </button>
            {!uploadWarning && (
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {mutation.isPending ? 'Enviando...' : 'Enviar reporte'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
