import type { SVGProps } from 'react';

// Set minimo de iconos inline (sin dependencia externa) resuelto por nombre logico.
// Sumar un icono nuevo = agregar una entrada aca; el sidebar no cambia.
const paths: Record<string, string> = {
  dashboard: 'M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h8v8H3v-8zm10 3h8v5h-8v-5z',
  modules: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  tasks: 'M4 6h16M4 12h16M4 18h7',
  roadmap: 'M4 12h4l2-6 4 12 2-6h4',
  gantt: 'M4 5h6M4 10h10M4 15h7M4 20h12',
  users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  settings:
    'M12 8a4 4 0 100 8 4 4 0 000-8zM2 12h2m16 0h2M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
};

export function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  const d = paths[name] ?? paths.dashboard;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={d} />
    </svg>
  );
}
