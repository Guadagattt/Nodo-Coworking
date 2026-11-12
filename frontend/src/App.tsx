import { ReactNode, useState } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Login from "./pages/Login";
import Reservar from "./pages/Reservar";
import MisReservas from "./pages/MisReservas";
import MiMembresia from "./pages/MiMembresia";
import Admin from "./pages/Admin";

function Protegida({ children, soloAdmin = false }: { children: ReactNode; soloAdmin?: boolean }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p className="centrado">Cargando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (soloAdmin && usuario.rol !== "admin") return <Navigate to="/reservar" replace />;
  return <>{children}</>;
}

function Encabezado() {
  const { usuario, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  if (!usuario) return null;
  const cerrar = () => setAbierto(false);
  return (
    <header className="encabezado">
      <div className="encabezado-interior">
        <NavLink to="/reservar" className="marca" onClick={cerrar}>
          <span className="marca-punto" /> Nodo Coworking
        </NavLink>
        <button className="menu-boton" aria-label="Menú" onClick={() => setAbierto(!abierto)}>☰</button>
        <nav className={abierto ? "nav abierto" : "nav"}>
          <NavLink to="/reservar" onClick={cerrar}>Reservar</NavLink>
          <NavLink to="/mis-reservas" onClick={cerrar}>Mis reservas</NavLink>
          {usuario.rol === "socio" && <NavLink to="/membresia" onClick={cerrar}>Mi membresía</NavLink>}
          {usuario.rol === "admin" && <NavLink to="/admin" onClick={cerrar}>Administración</NavLink>}
          <span className="usuario">{usuario.nombre}</span>
          <button className="boton-texto" onClick={logout}>Salir</button>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Encabezado />
      <main className="contenido">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reservar" element={<Protegida><Reservar /></Protegida>} />
          <Route path="/mis-reservas" element={<Protegida><MisReservas /></Protegida>} />
          <Route path="/membresia" element={<Protegida><MiMembresia /></Protegida>} />
          <Route path="/admin" element={<Protegida soloAdmin><Admin /></Protegida>} />
          <Route path="*" element={<Navigate to="/reservar" replace />} />
        </Routes>
      </main>
    </>
  );
}
