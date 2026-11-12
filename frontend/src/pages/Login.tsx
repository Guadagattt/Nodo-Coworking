import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const CUENTAS_DEMO = [
  { etiqueta: "Socia (Sofía, Plan Pro)", email: "sofia@nodo.com", password: "sofia123" },
  { etiqueta: "Administradora (Valentina)", email: "valentina@nodo.com", password: "admin123" },
];

export default function Login() {
  const { usuario, login } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/reservar" replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await login(email, password);
      navegar("/reservar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <div className="tarjeta login-tarjeta">
        <div className="marca marca-grande"><span className="marca-punto" /> Nodo Coworking</div>
        <h1>Iniciar sesión</h1>
        <p className="suave">Reservá salas y consultá tu plan desde cualquier dispositivo.</p>
        <form onSubmit={enviar} className="formulario">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="mensaje-error" role="alert">{error}</p>}
          <button className="boton" disabled={enviando}>{enviando ? "Ingresando…" : "Ingresar"}</button>
        </form>
        <div className="demo">
          <p className="suave">Cuentas de prueba (completan el formulario):</p>
          {CUENTAS_DEMO.map((c) => (
            <button key={c.email} type="button" className="boton-secundario"
              onClick={() => { setEmail(c.email); setPassword(c.password); }}>
              {c.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
