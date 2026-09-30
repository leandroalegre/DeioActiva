import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from './work-items-api';
import type { WorkItemChecklistItem } from '../types/work-item';

// Utilidades del checklist y de las imagenes de una tarea (compartidas por el formulario de
// alta, el detalle y la tarjeta del Kanban).

export function checklistProgress(items: WorkItemChecklistItem[] | undefined) {
  const total = items?.length ?? 0;
  const done = items?.filter((i) => i.done).length ?? 0;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

// Convierte el texto pegado/escrito en items: uno por linea, sin viñetas ni numeracion
// ("- ", "* ", "1. ", "1) ", "[ ] ").
export function parseChecklistLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+|\[[ xX]?\]\s*)/, '').trim())
    .filter((line) => line.length > 0);
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.split(',').includes(file.type)) {
    return `"${file.name}": formato no soportado (PNG, JPG, GIF o WEBP).`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}": supera el máximo de 5 MB.`;
  }
  return null;
}

// Devuelve las imagenes pegadas con Ctrl+V (ej. una captura de pantalla recien sacada).
export function imagesFromClipboard(e: React.ClipboardEvent): File[] {
  const files: File[] = [];
  for (const item of Array.from(e.clipboardData?.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const ext = file.type.split('/')[1] ?? 'png';
        files.push(
          file.name && file.name !== 'image.png'
            ? file
            : new File(
                [file],
                `captura-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`,
                {
                  type: file.type,
                },
              ),
        );
      }
    }
  }
  return files;
}
