import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { caption } from '../ui';

const tab = ({ isActive }: { isActive: boolean }) =>
  `flex h-full items-center whitespace-nowrap border-b-2 ${caption} ${isActive ? 'border-field text-field' : 'border-transparent hover:text-field'}`;

export function Shell() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-stretch justify-between gap-3 border-b border-rule px-4 sm:px-6">
        <div className="flex items-stretch gap-5 sm:gap-8">
          <span className="flex items-center whitespace-nowrap text-body font-bold">Secure Notes</span>
          <nav className="flex items-stretch gap-4 sm:gap-6">
            <NavLink to="/notes" className={tab}>
              Notes
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin/users" className={tab}>
                Users
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          {isAdmin && <span className={`hidden bg-ink px-1.5 py-1 text-paper sm:inline ${caption}`}>Admin</span>}
          <span className="hidden max-w-[28ch] truncate text-body md:inline">{user?.email}</span>
          <button onClick={logout} className={`whitespace-nowrap underline hover:text-field ${caption}`}>
            Sign out
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
