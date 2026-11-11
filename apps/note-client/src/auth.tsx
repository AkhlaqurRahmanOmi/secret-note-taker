import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  api,
  AuthResponse,
  json,
  SESSION_EXPIRED,
  TOKEN_KEY,
  User,
} from './api';
import { useToast } from './toast';

const USER_KEY = 'user';

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    interests: string[];
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readUser(): User | null {
  if (!localStorage.getItem(TOKEN_KEY)) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);
  const toast = useToast();

  const start = useCallback((res: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Refresh the stored user once per load, in case their role changed.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api<User>('/users/me')
      .then((fresh) => {
        localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const expired = () => {
      logout();
      toast({
        title: 'Session expired',
        detail: 'Sign in again to continue.',
        tone: 'error',
      });
    };
    window.addEventListener(SESSION_EXPIRED, expired);
    return () => window.removeEventListener(SESSION_EXPIRED, expired);
  }, [logout, toast]);

  const login = useCallback(
    async (email: string, password: string) =>
      start(
        await api<AuthResponse>('/auth/login', {
          method: 'POST',
          body: json({ email, password }),
        }),
      ),
    [start],
  );

  const register = useCallback<AuthState['register']>(
    async (input) =>
      start(
        await api<AuthResponse>('/auth/register', {
          method: 'POST',
          body: json(input),
        }),
      ),
    [start],
  );

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
