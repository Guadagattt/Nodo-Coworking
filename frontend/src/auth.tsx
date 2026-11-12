import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, Membresia, Usuario } from "./api";

interface Auth {
  usuario: Usuario | null;
  membresia: Membresia | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refrescar: () => Promise<void>;
}

const AuthContext = createContext<Auth>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [membresia, setMembresia] = useState<Membresia | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const me = await api<{ usuario: Usuario; membresia: Membresia | null }>("/me");
      setUsuario(me.usuario);
      setMembresia(me.membresia);
    } catch {
      // Token vencido (por ejemplo, porque se reinició el servidor)
      localStorage.removeItem("token");
      setUsuario(null);
      setMembresia(null);
    }
  }, []);

  useEffect(() => {
    refrescar().finally(() => setCargando(false));
  }, [refrescar]);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", r.token);
    await refrescar();
  };

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("token");
    setUsuario(null);
    setMembresia(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, membresia, cargando, login, logout, refrescar }}>
      {children}
    </AuthContext.Provider>
  );
}
