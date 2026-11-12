import { useEffect, useState } from "react";
import { api, fechaLarga, horas, hoyISO, Membresia, Reserva } from "../api";

interface SocioAdmin { id: number; nombre: string; email: string; membresia: Membresia | null }
interface PlanAdmin { id: number; nombre: string; horasSala: number; precioMensual: number; socios: number }

type Pestana = "reservas" | "socios" | "planes";

export default function Admin() {
  const [pestana, setPestana] = useState<Pestana>("reservas");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [socios, setSocios] = useState<SocioAdmin[]>([]);
  const [planes, setPlanes] = useState<PlanAdmin[]>([]);
  const [soloProximas, setSoloProximas] = useState(true);

  const cargar = () => {
    api<Reserva[]>("/admin/reservas").then(setReservas);
    api<SocioAdmin[]>("/admin/socios").then(setSocios);
    api<PlanAdmin[]>("/admin/planes").then(setPlanes);
  };
  useEffect(cargar, []);

  const cancelar = async (r: Reserva) => {
    if (!confirm(`¿Cancelar la reserva de ${r.socio} en ${r.sala} (${fechaLarga(r.fecha)} ${r.inicio}–${r.fin})?`)) return;
    await api(`/reservas/${r.id}`, { method: "DELETE" });
    cargar();
  };

  const hoy = hoyISO();
  const activas = reservas.filter((r) => r.estado === "confirmada");
  const proximas = activas.filter((r) => r.fecha >= hoy);
  const visibles = soloProximas ? proximas : reservas;

  return (
    <div className="pagina">
      <h1>Panel de administración</h1>

      <div className="metricas">
        <div className="tarjeta metrica"><span>{socios.length}</span>Socios activos</div>
        <div className="tarjeta metrica"><span>{proximas.length}</span>Reservas próximas</div>
        <div className="tarjeta metrica"><span>{horas(activas.reduce((t, r) => t + r.horas, 0))}</span>Horas de sala reservadas</div>
      </div>

      <div className="pestanas" role="tablist">
        {(["reservas", "socios", "planes"] as Pestana[]).map((p) => (
          <button key={p} role="tab" aria-selected={pestana === p} className={pestana === p ? "activa" : ""}
            onClick={() => setPestana(p)}>
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {pestana === "reservas" && (
        <div className="tarjeta tabla-contenedor">
          <label className="check">
            <input type="checkbox" checked={soloProximas} onChange={(e) => setSoloProximas(e.target.checked)} />
            Mostrar solo próximas
          </label>
          <table>
            <thead><tr><th>Fecha</th><th>Horario</th><th>Sala</th><th>Socio</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {visibles.map((r) => (
                <tr key={r.id} className={r.estado === "cancelada" ? "apagada" : ""}>
                  <td>{fechaLarga(r.fecha)}</td>
                  <td>{r.inicio}–{r.fin}</td>
                  <td>{r.sala}</td>
                  <td>{r.socio}</td>
                  <td>
                    <span className={r.estado === "cancelada" ? "etiqueta etiqueta-error" : "etiqueta etiqueta-ok"}>{r.estado}</span>
                  </td>
                  <td>
                    {r.estado === "confirmada" && r.fecha >= hoy && (
                      <button className="boton-texto peligro" onClick={() => cancelar(r)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && <tr><td colSpan={6} className="suave">No hay reservas.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {pestana === "socios" && (
        <div className="tarjeta tabla-contenedor">
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Plan</th><th>Horas usadas (mes)</th><th>Disponibles</th></tr></thead>
            <tbody>
              {socios.map((s) => (
                <tr key={s.id}>
                  <td>{s.nombre}</td>
                  <td>{s.email}</td>
                  <td>{s.membresia?.plan ?? "Sin plan vigente"}</td>
                  <td>{s.membresia ? `${horas(s.membresia.horasUsadas)} de ${horas(s.membresia.horasIncluidas)}` : "—"}</td>
                  <td>{s.membresia ? horas(s.membresia.horasDisponibles) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pestana === "planes" && (
        <div className="metricas">
          {planes.map((p) => (
            <div key={p.id} className="tarjeta plan">
              <h2>{p.nombre}</h2>
              <p className="precio">USD {p.precioMensual}<small>/mes</small></p>
              <p>{p.horasSala} h de sala por mes</p>
              <p className="suave">{p.socios} {p.socios === 1 ? "socio" : "socios"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
