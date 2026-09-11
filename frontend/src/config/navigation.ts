// Configuracion del sidebar. Agregar/quitar una seccion es editar este array: ningun
// componente tiene los items de menu hardcodeados, todos leen de aca (AppLayout / Sidebar).
export interface NavItem {
  label: string;
  path: string;
  icon: string; // nombre logico de icono, se resuelve en <Sidebar /> (ver ICONS)
  roles?: string[]; // si se omite, visible para cualquier rol autenticado
}

export const NAVIGATION: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  { label: 'Módulos', path: '/modulos', icon: 'modules' },
  { label: 'Tareas', path: '/tareas', icon: 'tasks' },
  { label: 'Roadmap', path: '/roadmap', icon: 'roadmap' },
  { label: 'Gantt', path: '/gantt', icon: 'gantt' },
  { label: 'Usuarios', path: '/usuarios', icon: 'users', roles: ['super_admin', 'admin'] },
  { label: 'Configuración', path: '/configuracion', icon: 'settings', roles: ['super_admin'] },
];
