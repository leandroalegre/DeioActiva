import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ACCEPTED_IMAGE_TYPES,
  deleteWorkItemImage,
  fetchWorkItemImageBlob,
  uploadWorkItemImage,
} from '../../lib/work-items-api';
import { getApiErrorMessage } from '../../lib/api-client';
import type { WorkItem, WorkItemAttachment } from '../../types/work-item';
import { imagesFromClipboard, validateImageFile } from '../../lib/work-item-extras';

// Imagenes adjuntas a una tarea (capturas, mockups). Se muestran como miniaturas y se abren
// en grande con un click. Como la API pide token, cada imagen se baja con axios y se muestra
// con un object URL (ver fetchWorkItemImageBlob).

function useImageUrl(workItemId: string, attachmentId: string) {
  const { data: blob, isError } = useQuery({
    queryKey: ['work-item-image', workItemId, attachmentId],
    queryFn: () => fetchWorkItemImageBlob(workItemId, attachmentId),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return { url, isError };
}

function Thumbnail({
  workItemId,
  attachment,
  onOpen,
  onDelete,
  deleting,
}: {
  workItemId: string;
  attachment: WorkItemAttachment;
  onOpen: (url: string, attachment: WorkItemAttachment) => void;
  // Sin onDelete (ej. perfil QA) la miniatura no ofrece quitar la imagen.
  onDelete?: () => void;
  deleting: boolean;
}) {
  const { url, isError } = useImageUrl(workItemId, attachment.id);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="group relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {url ? (
        <button
          type="button"
          onClick={() => onOpen(url, attachment)}
          className="h-full w-full"
          title={attachment.fileName}
        >
          <img src={url} alt={attachment.fileName} className="h-full w-full object-cover" />
        </button>
      ) : (
        <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-slate-400">
          {isError ? 'No se pudo cargar' : 'Cargando...'}
        </div>
      )}
      {!onDelete ? null : !confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          title="Quitar imagen"
          className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white group-hover:flex"
        >
          ✕
        </button>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/90 p-1">
          <span className="text-[10px] font-medium text-red-600">¿Quitar?</span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white disabled:opacity-60"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="rounded px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImageLightbox({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <img
        src={url}
        alt={fileName}
        className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="mt-3 flex items-center gap-4 text-sm text-white/90">
        <span className="truncate">{fileName}</span>
        <a
          href={url}
          download={fileName}
          onClick={(e) => e.stopPropagation()}
          className="rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25"
        >
          Descargar
        </a>
        <button
          onClick={onClose}
          className="rounded bg-white/15 px-2 py-1 text-xs hover:bg-white/25"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// Seccion "Imagenes" del detalle de la tarea: ver, agregar (boton o Ctrl+V) y quitar.
export function WorkItemImagesSection({
  item,
  canDelete = true,
}: {
  item: WorkItem;
  canDelete?: boolean;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const attachments = item.attachments ?? [];

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const failures: string[] = [];
      for (const file of files) {
        try {
          await uploadWorkItemImage(item.id, file);
        } catch (err) {
          failures.push(getApiErrorMessage(err, `No se pudo subir "${file.name}".`));
        }
      }
      return failures;
    },
    onSuccess: (failures) => {
      if (failures.length) setError(failures.join(' '));
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteWorkItemImage(item.id, attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-items'] }),
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo quitar la imagen.')),
  });

  function handleFiles(files: File[]) {
    setError(null);
    const problems = files.map(validateImageFile).filter((p): p is string => Boolean(p));
    const valid = files.filter((f) => !validateImageFile(f));
    if (problems.length) setError(problems.join(' '));
    if (valid.length) uploadMutation.mutate(valid);
  }

  return (
    <div
      className="mb-4"
      onPaste={(e) => {
        const files = imagesFromClipboard(e);
        if (files.length) {
          e.preventDefault();
          handleFiles(files);
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Imágenes {attachments.length > 0 ? `(${attachments.length})` : ''}
        </h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-60"
        >
          {uploadMutation.isPending ? 'Subiendo...' : '+ Adjuntar imagen'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>
      {attachments.length === 0 && (
        <p className="text-xs text-slate-400">
          Sin imágenes. Podés adjuntar una o pegarla con Ctrl+V sobre esta sección.
        </p>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <Thumbnail
              key={a.id}
              workItemId={item.id}
              attachment={a}
              onOpen={(url, att) => setPreview({ url, fileName: att.fileName })}
              onDelete={canDelete ? () => deleteMutation.mutate(a.id) : undefined}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {preview && (
        <ImageLightbox
          url={preview.url}
          fileName={preview.fileName}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
