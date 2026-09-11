import { NavLink } from 'react-router-dom';
import { NAVIGATION } from '../../config/navigation';
import { useAuth } from '../../app/auth/AuthContext';
import { Icon } from './icons';

export function Sidebar() {
  const { user } = useAuth();
  const roleCode = user?.role.code;

  const items = NAVIGATION.filter((item) => !item.roles || (roleCode && item.roles.includes(roleCode)));

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <div className="h-8 w-8 rounded-lg bg-brand-500" />
        <span className="text-lg font-semibold text-slate-800">DeioActiva</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
