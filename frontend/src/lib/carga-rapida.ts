// Carga rápida de puntos del orden del día, sin IA: un punto por línea (mismo formato que
// la carga rápida de tareas de Gestión Activa y DNT).
//   Revisar presupuesto @Juan !20/11
//   Llamar al proveedor @ana !2026-12-01
// "@nombre" busca al responsable entre los usuarios (por nombre o apellido, sin acentos);
// "!fecha" es el vencimiento (dd/mm, dd/mm/aaaa o aaaa-mm-dd). Lo que queda es el título.

export interface UsuarioBasico {
  id: string;
  nombreCompleto: string;
  email?: string;
  activo?: boolean;
}

export interface LineaCargaRapida {
  titulo: string;
  responsables: UsuarioBasico[];
  /** Menciones que no coinciden con ningún usuario (se guardan como texto). */
  sinUsuario: string[];
  vence: string | null;
  /** Problemas para mostrar antes de guardar. */
  avisos: string[];
}

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const pad = (n: number) => String(n).padStart(2, '0');

const fechaValida = (y: number, m: number, d: number) => {
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
};

/** "20/11", "20/11/2026", "2026-11-20" → "2026-11-20" (o null). Sin año: el próximo 20/11. */
export const parsearFecha = (txt: string, hoy: Date = new Date()): string | null => {
  const t = txt.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return fechaValida(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(t);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y: number;
  if (m[3]) {
    y = Number(m[3]);
    if (y < 100) y += 2000;
  } else {
    y = hoy.getFullYear();
    const hoyKey = `${y}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
    if (`${y}-${pad(mo)}-${pad(d)}` < hoyKey) y += 1;
  }
  return fechaValida(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
};

/** Busca un usuario por "@texto": nombre completo, nombre, apellido o comienzo del email. */
export const buscarUsuario = (mencion: string, usuarios: UsuarioBasico[]): UsuarioBasico | null => {
  const q = normalizar(mencion.replace(/[_.]/g, ' '));
  if (!q) return null;
  const activos = usuarios.filter(u => u.activo !== false);
  const exactos = activos.filter(u => normalizar(u.nombreCompleto) === q);
  if (exactos.length === 1) return exactos[0];
  const porPalabra = activos.filter(u => {
    const palabras = normalizar(u.nombreCompleto).split(/\s+/);
    const email = normalizar((u.email || '').split('@')[0]);
    return palabras.some(p => p === q) || email === q || palabras.some(p => p.startsWith(q));
  });
  return porPalabra.length === 1 ? porPalabra[0] : null;
};

export const parsearLinea = (linea: string, usuarios: UsuarioBasico[], hoy: Date = new Date()): LineaCargaRapida | null => {
  const texto = linea.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
  if (!texto) return null;
  const responsables: UsuarioBasico[] = [];
  const sinUsuario: string[] = [];
  const avisos: string[] = [];
  let vence: string | null = null;

  const restos = texto.split(/\s+/).filter(tok => {
    if (tok.startsWith('@') && tok.length > 1) {
      const nombre = tok.slice(1);
      const u = buscarUsuario(nombre, usuarios);
      if (u) {
        if (!responsables.some(r => r.id === u.id)) responsables.push(u);
      } else {
        sinUsuario.push(nombre.replace(/[_.]/g, ' '));
        avisos.push(`No encontré a "@${nombre}"`);
      }
      return false;
    }
    if (tok.startsWith('!') && tok.length > 1) {
      const f = parsearFecha(tok.slice(1), hoy);
      if (f) vence = f;
      else avisos.push(`Fecha no válida: "${tok}"`);
      return false;
    }
    return true;
  });
  const titulo = restos.join(' ').trim();
  if (!titulo) return null;
  return { titulo, responsables, sinUsuario, vence, avisos };
};

export const parsearCargaRapida = (texto: string, usuarios: UsuarioBasico[], hoy: Date = new Date()): LineaCargaRapida[] =>
  texto
    .split(/\r?\n/)
    .map(l => parsearLinea(l, usuarios, hoy))
    .filter((x): x is LineaCargaRapida => x !== null);
