import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fechaLarga, horas, hoyISO, Reserva } from "../api";
import { useAuth } from "../auth";

export default function MisReservas() {
  const { refrescar } = useAuth();
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [error, setError] = useState("");

  const cargar = () => api<Reserva[]>("/reservas/mias").then(setReservas);
  useEffect(() => { cargar(); }, []);

  const cancelar = async (r: Reserva) => {
    if (!confirm(`¿Cancelar la reserva de ${r.sala} del ${fechaLarga(r.fecha)} (${r.inicio}–${r.fin})?`)) return;
    setError("");
    try {
      await api(`/reservas/${r.id}`, { method: "DELETE" });
      await cargar();
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar");
    }
  };

  if (!reservas) return <p className="centrado">Cargando…</p>;
  const hoy = hoyISO();
  const esProxima = (r: Reserva) => r.estado === "confirmada" && r.fecha >= hoy;
  const proximas = reservas.filter(esProxima);
  const anteriores = reservas.filter((r) => !esProxima(r)).reverse();

  return (
    <div className="pagina">
      <div className="titulo-fila">
        <h1>Mis reservas</h1>
        <Link to="/reservar" className="boton">+ Nueva reserva</Link>
      </div>
      {error && <p className="mensaje-error">{error}</p>}

      <h2>Próximas</h2>
      {proximas.length === 0 && <p className="suave">No tenés reservas próximas.</p>}
      <div className="lista-tarjetas">
        {proximas.map((r) => (
          <div key={r.id} className="tarjeta fila-reserva">
            <div>
              <strong>{r.sala}</strong>
              <p className="suave">{fechaLarga(r.fecha)} · {r.inicio} a {r.fin} · {horas(r.horas)}</p>
            </div>
            <button className="boton-peligro" onClick={() => cancelar(r)}>Cancelar</button>
          </div>
        ))}
      </div>

      {anteriores.length > 0 && (
        <>
          <h2>Historial</h2>
          <div className="lista-tarjetas">
            {anteriores.map((r) => (
              <div key={r.id} className="tarjeta fila-reserva apagada">
                <div>
                  <strong>{r.sala}</strong>
                  <p className="suave">{fechaLarga(r.fecha)} · {r.inicio} a {r.fin} · {horas(r.horas)}</p>
                </div>
                <span className={r.estado === "cancelada" ? "etiqueta etiqueta-error" : "etiqueta"}>
                  {r.estado === "cancelada" ? "Cancelada" : "Realizada"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
