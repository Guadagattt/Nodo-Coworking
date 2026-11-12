import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, Disponibilidad, fechaLarga, Franja, horas, hoyISO, Reserva, Sala } from "../api";
import { useAuth } from "../auth";

// Próximo día hábil a partir de hoy
function proximoDiaHabil(): string {
  const d = new Date(`${hoyISO()}T12:00:00`);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
// Opciones cada 30 minutos entre 08:00 y 20:00 (horario comercial)
const OPCIONES_HORA = Array.from({ length: 25 }, (_, i) => {
  const m = 8 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 === 0 ? "00" : "30"}`;
});

type Resultado =
  | { tipo: "disponible"; datos: Disponibilidad }
  | { tipo: "ocupado"; datos: Disponibilidad }
  | { tipo: "invalido"; mensaje: string }
  | { tipo: "confirmada"; reserva: Reserva };

export default function Reservar() {
  const { usuario, membresia, refrescar } = useAuth();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [salaId, setSalaId] = useState(1);
  const [fecha, setFecha] = useState(proximoDiaHabil());
  const [inicio, setInicio] = useState("10:00");
  const [fin, setFin] = useState("11:00");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [agenda, setAgenda] = useState<Franja[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { api<Sala[]>("/salas").then(setSalas); }, []);

  const cargarAgenda = () => {
    if (fecha) api<Franja[]>(`/salas/${salaId}/agenda?fecha=${fecha}`).then(setAgenda).catch(() => setAgenda([]));
  };
  useEffect(cargarAgenda, [salaId, fecha]);

  const salaActual = salas.find((s) => s.id === salaId);
  const duracion = (aMin(fin) - aMin(inicio)) / 60;

  // Prevención de errores: se valida antes de consultar y se marcan los campos a corregir
  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!fecha) e.fecha = "Elegí una fecha";
    else {
      const dia = new Date(`${fecha}T12:00:00`).getDay();
      if (fecha < hoyISO()) e.fecha = "La fecha ya pasó";
      else if (dia === 0 || dia === 6) e.fecha = "Las salas se reservan de lunes a viernes";
    }
    if (aMin(inicio) >= aMin(fin)) e.fin = "La hora de fin debe ser posterior a la de inicio";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const consultar = async (ini = inicio, f = fin) => {
    setResultado(null);
    try {
      const d = await api<Disponibilidad>(`/salas/${salaId}/disponibilidad?fecha=${fecha}&inicio=${ini}&fin=${f}`);
      setResultado({ tipo: d.disponible ? "disponible" : "ocupado", datos: d });
    } catch (err) {
      setResultado({ tipo: "invalido", mensaje: err instanceof Error ? err.message : "Error" });
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (validar()) consultar();
  };

  const elegirSugerencia = (s: Franja) => {
    setInicio(s.inicio);
    setFin(s.fin);
    consultar(s.inicio, s.fin);
  };

  const confirmar = async () => {
    setOcupado(true);
    try {
      const reserva = await api<Reserva>("/reservas", {
        method: "POST",
        body: JSON.stringify({ salaId, fecha, inicio, fin }),
      });
      setResultado({ tipo: "confirmada", reserva });
      cargarAgenda();
      refrescar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Alguien la reservó entre la consulta y la confirmación
        setResultado({
          tipo: "ocupado",
          datos: { sala: salaActual?.nombre ?? "", fecha, inicio, fin, disponible: false, ...err.datos },
        });
        cargarAgenda();
      } else {
        setResultado({ tipo: "invalido", mensaje: err instanceof Error ? err.message : "Error" });
      }
    } finally {
      setOcupado(false);
    }
  };

  const cambiar = (fn: () => void) => { fn(); setResultado(null); setErrores({}); };
  const sinSaldo = usuario?.rol === "socio" && !!membresia && duracion > membresia.horasDisponibles;

  return (
    <div className="pagina">
      <div className="titulo-fila">
        <h1>Reservar una sala</h1>
        {membresia && (
          <Link to="/membresia" className="chip">
            {membresia.plan}: <strong>{horas(membresia.horasDisponibles)}</strong> disponibles
          </Link>
        )}
      </div>

      <div className="grilla-reserva">
        <form className="tarjeta formulario" onSubmit={enviar} noValidate>
          <label>
            Sala
            <select value={salaId} onChange={(e) => cambiar(() => setSalaId(Number(e.target.value)))}>
              {salas.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.capacidad} personas</option>)}
            </select>
          </label>
          <label>
            Fecha
            <input type="date" value={fecha} min={hoyISO()} className={errores.fecha ? "campo-error" : ""}
              onChange={(e) => cambiar(() => setFecha(e.target.value))} />
            {errores.fecha && <span className="texto-error">{errores.fecha}</span>}
          </label>
          <div className="dos-columnas">
            <label>
              Hora de inicio
              <select value={inicio} onChange={(e) => cambiar(() => setInicio(e.target.value))}>
                {OPCIONES_HORA.slice(0, -1).map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
            <label>
              Hora de fin
              <select value={fin} className={errores.fin ? "campo-error" : ""} onChange={(e) => cambiar(() => setFin(e.target.value))}>
                {OPCIONES_HORA.slice(1).map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
          </div>
          {errores.fin && <span className="texto-error">{errores.fin}</span>}
          <button className="boton">Consultar disponibilidad</button>
        </form>

        <div className="columna">
          {resultado && (
            <Panel resultado={resultado} duracion={duracion} sinSaldo={sinSaldo}
              esAdmin={usuario?.rol === "admin"} ocupado={ocupado}
              onConfirmar={confirmar} onSugerencia={elegirSugerencia} onNueva={() => setResultado(null)} />
          )}

          <div className="tarjeta">
            <h2>Ocupación del día</h2>
            <p className="suave">{salaActual?.nombre} · {fecha ? fechaLarga(fecha) : "—"}</p>
            <LineaDeTiempo agenda={agenda} inicio={inicio} fin={fin} />
            {agenda.length === 0
              ? <p className="suave">No hay reservas para este día.</p>
              : <ul className="lista-simple">{agenda.map((a) => <li key={a.inicio}>Ocupada de {a.inicio} a {a.fin}</li>)}</ul>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel(p: {
  resultado: Resultado; duracion: number; sinSaldo: boolean; esAdmin: boolean; ocupado: boolean;
  onConfirmar: () => void; onSugerencia: (s: Franja) => void; onNueva: () => void;
}) {
  const r = p.resultado;
  if (r.tipo === "invalido") {
    return (
      <div className="tarjeta estado estado-error" role="alert">
        <span className="etiqueta etiqueta-error">Revisá los horarios</span>
        <p>{r.mensaje}</p>
      </div>
    );
  }
  if (r.tipo === "confirmada") {
    const x = r.reserva;
    return (
      <div className="tarjeta estado estado-ok" role="status">
        <span className="etiqueta etiqueta-ok">✓ Reserva confirmada</span>
        <p><strong>{x.sala}</strong> · {fechaLarga(x.fecha)} · {x.inicio} a {x.fin}</p>
        <div className="acciones">
          <Link to="/mis-reservas" className="boton">Ver mis reservas</Link>
          <button className="boton-secundario" onClick={p.onNueva}>Hacer otra reserva</button>
        </div>
      </div>
    );
  }
  const d = r.datos;
  const resumen = <p><strong>{d.sala}</strong> · {fechaLarga(d.fecha)} · {d.inicio} a {d.fin}</p>;
  if (r.tipo === "disponible") {
    return (
      <div className="tarjeta estado estado-ok" role="status">
        <span className="etiqueta etiqueta-ok">✓ Disponible</span>
        {resumen}
        {!p.esAdmin && <p className="suave">Se descontará {horas(p.duracion)} de tu saldo.</p>}
        {p.sinSaldo
          ? <p className="mensaje-error">No te alcanzan las horas de tu plan para esta reserva.</p>
          : <button className="boton" onClick={p.onConfirmar} disabled={p.ocupado}>
              {p.ocupado ? "Reservando…" : "Confirmar reserva"}
            </button>}
      </div>
    );
  }
  return (
    <div className="tarjeta estado estado-ocupado" role="status">
      <span className="etiqueta etiqueta-error">✕ Ocupado</span>
      {resumen}
      <p className="suave">
        Ya hay {d.conflictos.length === 1 ? "una reserva" : "reservas"} de{" "}
        {d.conflictos.map((c) => `${c.inicio} a ${c.fin}`).join(", ")}. No se descontaron horas.
      </p>
      {d.sugerencias?.length > 0 && (
        <>
          <p><strong>Horarios cercanos libres:</strong></p>
          <div className="acciones">
            {d.sugerencias.map((s) => (
              <button key={s.inicio} className="boton-secundario" onClick={() => p.onSugerencia(s)}>
                {s.inicio} – {s.fin}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Barra de 8 a 20 h con las reservas del día y el horario elegido
function LineaDeTiempo({ agenda, inicio, fin }: { agenda: Franja[]; inicio: string; fin: string }) {
  const total = 12 * 60;
  const pos = (h: string) => ((aMin(h) - 480) / total) * 100;
  return (
    <div className="linea">
      <div className="linea-barra">
        {agenda.map((a) => (
          <div key={a.inicio} className="linea-ocupada" title={`Ocupada ${a.inicio}–${a.fin}`}
            style={{ left: `${pos(a.inicio)}%`, width: `${pos(a.fin) - pos(a.inicio)}%` }} />
        ))}
        {aMin(inicio) < aMin(fin) && (
          <div className="linea-elegida" style={{ left: `${pos(inicio)}%`, width: `${pos(fin) - pos(inicio)}%` }} />
        )}
      </div>
      <div className="linea-horas">{[8, 10, 12, 14, 16, 18, 20].map((h) => <span key={h}>{h}</span>)}</div>
      <div className="leyenda">
        <span><i className="cuadro cuadro-ocupado" /> Ocupada</span>
        <span><i className="cuadro cuadro-elegido" /> Tu horario</span>
      </div>
    </div>
  );
}
