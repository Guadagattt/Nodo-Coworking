import { Link } from "react-router-dom";
import { horas } from "../api";
import { useAuth } from "../auth";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fechaCorta = (f: string) => f.split("-").reverse().join("/");

export default function MiMembresia() {
  const { membresia } = useAuth();
  if (!membresia) {
    return (
      <div className="pagina">
        <h1>Mi membresía</h1>
        <p className="suave">No tenés una membresía vigente. Consultá con la administración.</p>
      </div>
    );
  }
  const m = membresia;
  const porcentaje = Math.min((m.horasUsadas / m.horasIncluidas) * 100, 100);
  const mes = MESES[Number(m.mes.slice(5)) - 1];

  return (
    <div className="pagina">
      <h1>Mi membresía</h1>
      <div className="tarjeta membresia">
        <span className="etiqueta etiqueta-lima">{m.plan}</span>
        <p className="saldo"><strong>{horas(m.horasDisponibles)}</strong> disponibles de {horas(m.horasIncluidas)} mensuales</p>
        <div className="progreso" role="progressbar" aria-valuenow={m.horasUsadas} aria-valuemin={0} aria-valuemax={m.horasIncluidas}>
          <div className="progreso-relleno" style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="suave">Usaste {horas(m.horasUsadas)} de sala en {mes}. El saldo se renueva el primer día de cada mes.</p>
        <p className="suave">Vigencia: {fechaCorta(m.vigencia.desde)} al {fechaCorta(m.vigencia.hasta)}</p>
        <Link to="/reservar" className="boton">Reservar una sala</Link>
      </div>
    </div>
  );
}
