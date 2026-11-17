import { useEffect, useRef, useState } from 'react';

// Dictado por voz con el reconocimiento del propio navegador (Chrome/Edge). No usa IA paga
// ni consume tokens. En navegadores sin soporte el boton no se muestra.

type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  start: () => void;
  stop: () => void;
};

function constructorReconocedor(): (new () => Reconocedor) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function dictadoDisponible() {
  return constructorReconocedor() !== null;
}

// Suma una frase dictada al final de un texto, con espacio o salto segun corresponda.
export function sumarDictado(actual: string, frase: string, separador = ' ') {
  if (!actual.trim()) return frase;
  return actual.endsWith('\n') ? `${actual}${frase}` : `${actual}${separador}${frase}`;
}

interface Props {
  /** Recibe cada frase reconocida, ya terminada. */
  onTexto: (texto: string) => void;
  etiqueta?: string;
  className?: string;
}

export function DictadoBoton({ onTexto, etiqueta, className = '' }: Props) {
  const [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Reconocedor | null>(null);
  const onTextoRef = useRef(onTexto);
  onTextoRef.current = onTexto;

  useEffect(() => () => recRef.current?.stop(), []);

  const Ctor = constructorReconocedor();
  if (!Ctor) return null;

  function empezar() {
    const rec = new Ctor!();
    rec.lang = 'es-AR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = String(e.results[i][0]?.transcript || '').trim();
          if (t) onTextoRef.current(t);
        }
      }
    };
    rec.onerror = (e: any) => {
      setError(
        e?.error === 'not-allowed'
          ? 'Permití el micrófono en el navegador.'
          : 'No se pudo usar el micrófono.',
      );
      setEscuchando(false);
    };
    rec.onend = () => setEscuchando(false);
    recRef.current = rec;
    setError(null);
    rec.start();
    setEscuchando(true);
  }

  function parar() {
    recRef.current?.stop();
    setEscuchando(false);
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={escuchando ? parar : empezar}
        title={escuchando ? 'Dejar de dictar' : 'Dictar con el micrófono'}
        aria-label={escuchando ? 'Dejar de dictar' : 'Dictar con el micrófono'}
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${
          escuchando
            ? 'animate-pulse border-red-600 bg-red-600 text-white'
            : 'border-slate-200 text-brand-700 hover:bg-slate-50'
        } ${className}`}
      >
        <span aria-hidden>{escuchando ? '■' : '🎤'}</span>
        {etiqueta && <span>{escuchando ? 'Escuchando…' : etiqueta}</span>}
      </button>
      {error && <span className="mt-0.5 text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
