import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, clearToken, getToken, setToken, OfflineError } from "./api";
import type { User } from "./types";

const USER_KEY = "kinflow_user";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persistUser(user: User | null) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  registerViaInvite: (name: string, username: string, password: string, token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  checkStatus: () => Promise<{ hasUsers: boolean; hasFamily: boolean }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((data) => {
        setUser(data);
        persistUser(data);
      })
      .catch((err) => {
        if (err instanceof OfflineError) {
          // keep local session in offline mode
          setUser(readCachedUser());
        } else {
          clearToken();
          persistUser(null);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>("/auth/login", {
      username,
      password,
    });
    setToken(data.token);
    setUser(data.user);
    persistUser(data.user);
  };

  const register = async (name: string, username: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>("/auth/register", {
      name,
      username,
      password,
    });
    setToken(data.token);
    setUser(data.user);
    persistUser(data.user);
  };

  const registerViaInvite = async (name: string, username: string, password: string, token: string) => {
    const data = await api.post<{ token: string; user: User }>("/auth/invite/register", {
      name,
      username,
      password,
      token,
    });
    setToken(data.token);
    setUser(data.user);
    persistUser(data.user);
  };

  const logout = () => {
    clearToken();
    persistUser(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const data = await api.get<User>("/auth/me");
    setUser(data);
    persistUser(data);
  };

  const checkStatus = async () => {
    return api.get<{ hasUsers: boolean; hasFamily: boolean }>("/auth/status");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, registerViaInvite, logout, refreshUser, checkStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
